const RECENT_SEARCHES_STORAGE_KEY = "mosaic-recent-searches";
const MAX_RECENT_SEARCHES = 6;

export function getRecentSearches() {
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query) {
  const trimmed = query?.trim();
  if (!trimmed) {
    return;
  }

  try {
    const current = getRecentSearches();
    const updated = [
      trimmed,
      ...current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())
    ].slice(0, MAX_RECENT_SEARCHES);

    window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Unable to save recent search to localStorage.", error);
  }
}

export function removeRecentSearch(query) {
  try {
    const current = getRecentSearches();
    const updated = current.filter((item) => item.toLowerCase() !== query.toLowerCase());
    window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Unable to remove recent search from localStorage.", error);
  }
}

export function clearRecentSearches() {
  try {
    window.localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
  } catch (error) {
    console.error("Unable to clear recent searches from localStorage.", error);
  }
}
