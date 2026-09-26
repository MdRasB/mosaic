const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
const responseCache = new Map();
const restrictedContentPattern = /\b(?:adult|bondage|erotic|xxx|porn(?:ographic)?|sex(?:ual)?|nude|nudity|intercourse|fetish|lust)\b/i;
const restrictedMovieRatings = new Set(["NC-17", "X", "XXX"]);
const restrictedTvRatings = new Set(["TV-MA", "R+", "18", "18+"]);

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

function hasRestrictedCertification(details, type) {
  if (type === "tv") {
    return details.content_ratings?.results
      ?.filter((rating) => rating.iso_3166_1 === "US")
      .some((rating) => restrictedTvRatings.has(rating.rating)) ?? false;
  }

  return details.release_dates?.results
    ?.filter((release) => release.iso_3166_1 === "US")
    .flatMap((release) => release.release_dates ?? [])
    .some((release) => restrictedMovieRatings.has(release.certification)) ?? false;
}

async function getCertificationDetails(item, type) {
  const response = await request(`/${type}/${item.id}`, {
    append_to_response: type === "tv" ? "content_ratings" : "release_dates"
  });

  return hasRestrictedCertification(response, type);
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
  const data = await request(path, params);
  const candidates = (data.results ?? []).filter((item) => !isRestrictedContent(item));
  const checks = await Promise.allSettled(candidates.map(async (item) => ({
    item,
    restricted: await getCertificationDetails(item, type === "multi" ? item.media_type : type)
  })));

  return checks.flatMap((check) => {
    if (check.status === "rejected") {
      console.warn("Unable to verify media certification; hiding the title.", check.reason);
      return [];
    }

    return check.value.restricted ? [] : [normalizeMedia(check.value.item, type)];
  });
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
