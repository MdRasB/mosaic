const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
const responseCache = new Map();
const restrictedContentPattern = /\b(?:adult|bondage|erotic|xxx|porn(?:ographic)?|sex(?:ual)?|nude|nudity|intercourse|fetish|lust)\b/i;
const TARGET_ROW_SIZE = 20;
const MAX_PAGES_PER_SECTION = 5;

function getApiKey() {
  const apiKey = import.meta.env?.VITE_TMDB_API_KEY || window.MOSAIC_CONFIG?.tmdbApiKey;

  if (!apiKey) {
    throw new Error(
      "TMDB API key is not configured. Use Vite with frontend/.env or copy config.example.js to config.js for Live Server."
    );
  }

  return apiKey;
}

async function request(path, params = {}) {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set("api_key", getApiKey());

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  const cacheKey = url.toString();
  if (responseCache.has(cacheKey)) {
    return responseCache.get(cacheKey);
  }

  const requestPromise = fetch(url).then(async (response) => {
    if (!response.ok) {
      throw new Error(`TMDB request failed with status ${response.status}.`);
    }

    return response.json();
  });

  responseCache.set(cacheKey, requestPromise.catch((error) => {
    responseCache.delete(cacheKey);
    throw error;
  }));

  return responseCache.get(cacheKey);
}

export function imageUrl(path, size = "w500") {
  return path ? `${TMDB_IMAGE_BASE_URL}/${size}${path}` : "";
}

function isRestrictedContent(item) {
  const searchableText = [
    item.title,
    item.name,
    item.overview
  ].filter(Boolean).join(" ");

  return item.adult === true || restrictedContentPattern.test(searchableText);
}

export function normalizeMedia(item, type) {
  return {
    id: item.id,
    type: type === "multi" ? item.media_type : type,
    title: item.title ?? item.name ?? "Untitled",
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    releaseDate: item.release_date ?? item.first_air_date ?? "",
    rating: Number(item.vote_average ?? 0),
    overview: item.overview ?? ""
  };
}

async function getMedia(path, type, params = {}) {
  const safeItems = [];
  const seen = new Set();

  for (let page = 1; page <= MAX_PAGES_PER_SECTION && safeItems.length < TARGET_ROW_SIZE; page += 1) {
    const data = await request(path, { ...params, page });

    for (const item of data.results ?? []) {
      const itemType = type === "multi" ? item.media_type : type;
      const key = `${itemType}:${item.id}`;

      if (!itemType || seen.has(key) || isRestrictedContent(item)) {
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
