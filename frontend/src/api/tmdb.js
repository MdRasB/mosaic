/**
 * TMDB API Client and Content Safety Layer
 * Responsibilities: Provider integration, Error handling, Key security, Content safety filtering
 * Assigned Member: Md. Migdadur Rahman Khan (ID: 46)
 */

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
const DEFAULT_TIMEOUT_MS = 10000;
const TARGET_ROW_SIZE = 20;
const MAX_PAGES_PER_SECTION = 5;
const SUGGESTION_LIMIT = 8;
const MEDIA_TYPES = new Set(["movie", "tv"]);

const responseCache = new Map();
const restrictedContentPattern = /\b(?:adult|bondage|erotic|xxx|porn(?:ographic)?|sex(?:ual)?|nude|nudity|intercourse|fetish|lust)\b/i;

/**
 * Custom Error class representing errors from TMDB or network issues.
 */
export class TmdbError extends Error {
  constructor(message, { status = null, statusText = "", url = "", isTimeout = false, isNetworkError = false } = {}) {
    super(message);
    this.name = "TmdbError";
    this.status = status;
    this.statusText = statusText;
    this.url = url;
    this.isTimeout = isTimeout;
    this.isNetworkError = isNetworkError;
    this.isAuthError = status === 401;
    this.isRateLimited = status === 429;
    this.isNotFound = status === 404;
    this.isServerError = status >= 500 && status < 600;
  }
}

/**
 * Retrieves and validates the TMDB API key.
 * Enforces security rules: prevents leaks of server secrets or placeholder keys.
 */
export function getApiKey() {
  const apiKey = (import.meta.env?.VITE_TMDB_API_KEY || window.MOSAIC_CONFIG?.tmdbApiKey || "").trim();

  if (!apiKey || apiKey === "your_tmdb_api_key_here" || apiKey === "VITE_TMDB_API_KEY") {
    throw new TmdbError(
      "TMDB API key is not configured. Add VITE_TMDB_API_KEY in frontend/.env or copy config.example.js to config.js.",
      { isAuthError: true }
    );
  }

  // Security guard: Ensure a Supabase secret key or private backend secret wasn't accidentally supplied
  if (apiKey.startsWith("sbp_") || apiKey.includes("service_role") || apiKey.startsWith("ey") && apiKey.length > 150) {
    throw new TmdbError(
      "Security Alert: A private service or Supabase secret key was detected instead of a TMDB API key.",
      { isAuthError: true }
    );
  }

  return apiKey;
}

/**
 * Check if a valid TMDB API key is present without throwing.
 */
export function hasApiKey() {
  try {
    return Boolean(getApiKey());
  } catch {
    return false;
  }
}

/**
 * Clears the internal response cache.
 */
export function clearCache() {
  responseCache.clear();
}

/**
 * Executes an HTTP GET request to TMDB with timeout, error handling, and caching.
 */
async function request(path, params = {}, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const apiKey = getApiKey();
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set("api_key", apiKey);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const cacheKey = url.toString();
  if (responseCache.has(cacheKey)) {
    return responseCache.get(cacheKey);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const requestPromise = fetch(url, { signal: controller.signal })
    .then(async (response) => {
      clearTimeout(timeoutId);

      if (!response.ok) {
        let details = "";
        try {
          const body = await response.json();
          details = body.status_message || "";
        } catch {
          // Response body was not JSON
        }

        let message = `TMDB request failed with status ${response.status}.`;
        if (response.status === 401) {
          message = "Invalid or unauthorized TMDB API key. Please check your credentials.";
        } else if (response.status === 404) {
          message = "The requested media resource was not found on TMDB.";
        } else if (response.status === 429) {
          message = "TMDB rate limit reached. Please wait a moment and try again.";
        } else if (response.status >= 500) {
          message = "TMDB service is temporarily unavailable. Please try again later.";
        }

        if (details) {
          message += ` (${details})`;
        }

        throw new TmdbError(message, {
          status: response.status,
          statusText: response.statusText,
          url: url.pathname
        });
      }

      return response.json();
    })
    .catch((error) => {
      clearTimeout(timeoutId);
      // Evict failed requests so retry attempts can succeed
      responseCache.delete(cacheKey);

      if (error instanceof TmdbError) {
        throw error;
      }

      if (error.name === "AbortError") {
        throw new TmdbError(`TMDB request timed out after ${timeoutMs / 1000}s. Check your connection.`, {
          isTimeout: true,
          url: url.pathname
        });
      }

      throw new TmdbError(
        error.message || "Network error while connecting to TMDB. Check your internet connection.",
        {
          isNetworkError: true,
          url: url.pathname
        }
      );
    });

  responseCache.set(cacheKey, requestPromise);
  return requestPromise;
}

/**
 * Builds a full TMDB image URL.
 */
export function imageUrl(path, size = "w500") {
  return path ? `${TMDB_IMAGE_BASE_URL}/${size}${path}` : "";
}

/**
 * Evaluates whether an item contains restricted or explicit adult content.
 */
export function isRestrictedContent(item) {
  if (!item) return true;

  const searchableText = [
    item.title,
    item.name,
    item.overview,
    item.tagline
  ].filter(Boolean).join(" ");

  return item.adult === true || restrictedContentPattern.test(searchableText);
}

/**
 * Normalizes movie and TV items for media cards.
 */
export function normalizeMedia(item, type) {
  const resolvedType = type === "multi" ? item.media_type : (type || item.media_type || "movie");
  return {
    id: item.id,
    type: resolvedType,
    title: item.title ?? item.name ?? "Untitled",
    overview,
    description: overview,
    posterPath: item.poster_path,
    posterUrl: imageUrl(item.poster_path, "w342"),
    backdropPath: item.backdrop_path,
    backdropUrl: imageUrl(item.backdrop_path, "w1280"),
    releaseDate: item.release_date ?? item.first_air_date ?? "",
    rating: Number(item.vote_average ?? 0),
    voteCount: Number(item.vote_count ?? 0),
    language: item.original_language ?? "",
    genreIds: item.genre_ids ?? [],
    source: "tmdb"
  };
}

/**
 * Normalizes rich details for media details views (Module M04).
 */
export function normalizeMediaDetails(item, type) {
  const resolvedType = type || (item.first_air_date ? "tv" : "movie");
  const releaseDate = item.release_date || item.first_air_date || "";
  const releaseYear = releaseDate ? new Date(`${releaseDate}T00:00:00`).getFullYear() : null;

  let runtimeFormatted = "";
  if (item.runtime) {
    const hours = Math.floor(item.runtime / 60);
    const minutes = item.runtime % 60;
    runtimeFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  } else if (item.episode_run_time?.length) {
    runtimeFormatted = `${item.episode_run_time[0]}m per ep`;
  }

  return {
    id: item.id,
    type: resolvedType,
    title: item.title || item.name || "Untitled",
    originalTitle: item.original_title || item.original_name || "",
    tagline: item.tagline || "",
    overview: item.overview || "No overview available.",
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    posterUrl: imageUrl(item.poster_path, "w500"),
    backdropUrl: imageUrl(item.backdrop_path, "w1280"),
    releaseDate,
    releaseYear,
    rating: Number(item.vote_average ?? 0),
    voteCount: item.vote_count ?? 0,
    runtime: runtimeFormatted,
    rawRuntime: item.runtime || null,
    status: item.status || "Released",
    genres: (item.genres || []).map((genre) => genre.name),
    languages: (item.spoken_languages || []).map((lang) => lang.english_name || lang.name),
    productionCompanies: (item.production_companies || []).map((company) => company.name),
    numberOfSeasons: item.number_of_seasons || null,
    numberOfEpisodes: item.number_of_episodes || null,
    homepage: item.homepage || "",
    imdbId: item.imdb_id || null
  };
}

/**
 * Fetches rows of safe media items.
 */
async function getMedia(path, type, params = {}) {
  const safeItems = [];
  const seen = new Set();

  for (let page = 1; page <= MAX_PAGES_PER_SECTION && safeItems.length < TARGET_ROW_SIZE; page += 1) {
    const data = await request(path, { ...params, page });

    for (const item of data.results ?? []) {
      const itemType = type === "multi" ? item.media_type : type;
      const key = `${itemType}:${item.id}`;

      if (
        !itemType ||
        (type === "multi" && itemType !== "movie" && itemType !== "tv") ||
        seen.has(key) ||
        isRestrictedContent(item)
      ) {
        continue;
      }

      seen.add(key);
      safeItems.push(normalizeMedia(item, type));

      if (safeItems.length === TARGET_ROW_SIZE) {
        break;
      }
    }

    if (page >= (data.total_pages ?? page)) {
      break;
    }
  }

  return safeItems;
}

// Explore Endpoints
export function getTrending() {
  return getMedia("/trending/all/week", "multi", { include_adult: false }).then((items) =>
    items.filter((item) => item.type === "movie" || item.type === "tv")
  );
}

export function getPopularMovies() {
  return getMedia("/movie/popular", "movie", { include_adult: false });
}

export function getPopularTv() {
  return getMedia("/tv/popular", "tv", { include_adult: false });
}

export function getTopRated() {
  return getMedia("/movie/top_rated", "movie", { include_adult: false });
}

export function getUpcoming() {
  return getMedia("/movie/upcoming", "movie", { include_adult: false });
}

// Search and Suggestions
export async function searchSuggestions(query, limit = SUGGESTION_LIMIT) {
  const data = await request("/search/multi", {
    query,
    page: 1,
    include_adult: false
  });
  const seen = new Set();
  const items = [];

  for (const item of data.results ?? []) {
    if (items.length >= limit) {
      break;
    }

    if (item.media_type !== "movie" && item.media_type !== "tv") {
      continue;
    }

    const key = `${item.media_type}:${item.id}`;

    if (seen.has(key) || isRestrictedContent(item)) {
      continue;
    }

    seen.add(key);
    items.push(normalizeMedia(item, "multi"));
  }

  return items;
}

export async function searchMedia(query, page = 1) {
  const data = await request("/search/multi", {
    query,
    page,
    include_adult: false
  });
  const seen = new Set();
  const items = (data.results ?? [])
    .filter((item) => item.media_type === "movie" || item.media_type === "tv")
    .filter((item) => {
      const key = `${item.media_type}:${item.id}`;

      if (seen.has(key) || isRestrictedContent(item)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .map((item) => normalizeMedia(item, "multi"));

  return {
    items,
    page: data.page ?? page,
    totalPages: data.total_pages ?? page,
    totalResults: data.total_results ?? 0
  };
}

// ==========================================
// M04 Media Details & Provider Integrations
// ==========================================

/**
 * Fetches primary media details for a movie or TV show.
 */
export async function getMediaDetails(type, id) {
  const endpoint = type === "tv" ? `/tv/${id}` : `/movie/${id}`;
  const data = await request(endpoint);
  return normalizeMediaDetails(data, type);
}

/**
 * Fetches credits (cast and crew) for a movie or TV show.
 */
export async function getMediaCredits(type, id) {
  const endpoint = type === "tv" ? `/tv/${id}/credits` : `/movie/${id}/credits`;
  const data = await request(endpoint);

  const cast = (data.cast || []).slice(0, 10).map((member) => ({
    id: member.id,
    name: member.name,
    character: member.character,
    profilePath: member.profile_path,
    profileUrl: imageUrl(member.profile_path, "w185")
  }));

  const directors = (data.crew || [])
    .filter((member) => member.job === "Director" || member.job === "Executive Producer")
    .slice(0, 3)
    .map((member) => member.name);

  return { cast, directors };
}

/**
 * Fetches trailers and videos for a movie or TV show.
 */
export async function getMediaVideos(type, id) {
  const endpoint = type === "tv" ? `/tv/${id}/videos` : `/movie/${id}/videos`;
  const data = await request(endpoint);

  const youtubeVideos = (data.results || [])
    .filter((v) => v.site === "YouTube")
    .map((v) => ({
      id: v.id,
      key: v.key,
      name: v.name,
      type: v.type,
      isTrailer: v.type === "Trailer",
      embedUrl: `https://www.youtube-nocookie.com/embed/${v.key}`,
      youtubeUrl: `https://www.youtube.com/watch?v=${v.key}`
    }));

  const primaryTrailer = youtubeVideos.find((v) => v.isTrailer) || youtubeVideos[0] || null;

  return {
    videos: youtubeVideos,
    trailer: primaryTrailer
  };
}

/**
 * Fetches recommendations for a movie or TV show.
 */
export async function getMediaRecommendations(type, id, limit = 10) {
  const endpoint = type === "tv" ? `/tv/${id}/recommendations` : `/movie/${id}/recommendations`;
  const data = await request(endpoint);

  return (data.results || [])
    .filter((item) => !isRestrictedContent(item))
    .slice(0, limit)
    .map((item) => normalizeMedia(item, type));
}

/**
 * Fetches streaming watch providers for a movie or TV show.
 */
export async function getWatchProviders(type, id, region = "US") {
  const endpoint = type === "tv" ? `/tv/${id}/watch/providers` : `/movie/${id}/watch/providers`;
  const data = await request(endpoint);
  const regionalData = data.results?.[region];

  if (!regionalData) {
    return { link: null, stream: [], rent: [], buy: [] };
  }

  const mapProvider = (provider) => ({
    id: provider.provider_id,
    name: provider.provider_name,
    logoUrl: imageUrl(provider.logo_path, "w92")
  });

  return {
    link: regionalData.link || null,
    stream: (regionalData.flatrate || []).map(mapProvider),
    rent: (regionalData.rent || []).map(mapProvider),
    buy: (regionalData.buy || []).map(mapProvider)
  };
}

/**
 * Fetches full media details bundle in parallel using Promise.allSettled for fault tolerance.
 */
export async function getCompleteMediaDetails(type, id, { region = "US" } = {}) {
  const [detailsResult, creditsResult, videosResult, recsResult, providersResult] = await Promise.allSettled([
    getMediaDetails(type, id),
    getMediaCredits(type, id),
    getMediaVideos(type, id),
    getMediaRecommendations(type, id),
    getWatchProviders(type, id, region)
  ]);

  if (detailsResult.status === "rejected") {
    throw detailsResult.reason;
  }

  return {
    details: detailsResult.value,
    credits: creditsResult.status === "fulfilled" ? creditsResult.value : { cast: [], directors: [] },
    videos: videosResult.status === "fulfilled" ? videosResult.value : { videos: [], trailer: null },
    recommendations: recsResult.status === "fulfilled" ? recsResult.value : [],
    watchProviders: providersResult.status === "fulfilled" ? providersResult.value : { link: null, stream: [], rent: [], buy: [] }
  };
}

/**
 * Health check diagnostic function for TMDB provider connectivity.
 */
export async function checkProviderHealth() {
  try {
    const data = await request("/configuration");
    return {
      ok: true,
      status: "connected",
      imagesConfig: Boolean(data?.images?.base_url)
    };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      message: error.message,
      isAuthError: error.isAuthError,
      isNetworkError: error.isNetworkError
    };
  }
}
