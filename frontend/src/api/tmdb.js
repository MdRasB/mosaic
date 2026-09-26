const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
const responseCache = new Map();

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
    if (value) {
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
  return (data.results ?? []).map((item) => normalizeMedia(item, type));
}

export function getTrending() {
  return getMedia("/trending/all/week", "multi").then((items) =>
    items.filter((item) => item.type === "movie" || item.type === "tv")
  );
}

export function getPopularMovies() {
  return getMedia("/movie/popular", "movie");
}

export function getPopularTv() {
  return getMedia("/tv/popular", "tv");
}

export function getTopRated() {
  return getMedia("/movie/top_rated", "movie");
}

export function getUpcoming() {
  return getMedia("/movie/upcoming", "movie");
}
