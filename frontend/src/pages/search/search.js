import { searchMedia } from "../../api/tmdb.js";
import { emptyState, errorState } from "../../components/empty-state/empty-state.js";
import { loadingCards, mediaRow } from "../../components/media-row/media-row.js";
import { escapeHtml } from "../../utils/escape-html.js";

const filters = [
  { id: "all", label: "All" },
  { id: "movie", label: "Movies" },
  { id: "tv", label: "TV Shows" }
];

function normalizeFilter(value) {
  return filters.some((filter) => filter.id === value) ? value : "all";
}

function getVisibleItems(items, filter) {
  return filter === "all" ? items : items.filter((item) => item.type === filter);
}

function searchMarkup(query, filter) {
  return `
    <section class="search-page" aria-labelledby="search-title">
      <div class="search-page-heading">
        <div>
          <p class="eyebrow">Global search</p>
          <h1 id="search-title">Results for “${escapeHtml(query)}”</h1>
          <p class="search-result-count" id="search-result-count">Searching...</p>
        </div>
        <div class="search-filters" role="group" aria-label="Filter search results">
          ${filters.map(({ id, label }) => `
            <button
              class="button button-ghost search-filter${id === filter ? " is-active" : ""}"
              type="button"
              data-search-filter="${id}"
              aria-pressed="${id === filter}"
            >${label}</button>
          `).join("")}
        </div>
      </div>
      <div class="search-results-grid" id="search-results-grid">${loadingCards(12)}</div>
      <div class="search-page-footer" id="search-page-footer"></div>
    </section>
  `;
}

function updateCount(container, count) {
  container.querySelector("#search-result-count").textContent =
    `${count} ${count === 1 ? "title" : "titles"} found`;
}

function renderResults(container, items, filter) {
  const grid = container.querySelector("#search-results-grid");
  const visibleItems = getVisibleItems(items, filter);
  grid.innerHTML = visibleItems.length
    ? mediaRow(visibleItems)
    : emptyState("No results found for this media type.");
  updateCount(container, visibleItems.length);
}

function renderLoadMore(container, state, loadNextPage) {
  const footer = container.querySelector("#search-page-footer");

  if (state.page >= state.totalPages) {
    footer.innerHTML = "";
    return;
  }

  footer.innerHTML = `
    <button class="button button-secondary" type="button" data-load-more>
      Load more
    </button>
  `;
  footer.querySelector("[data-load-more]").addEventListener("click", loadNextPage);
}

export async function renderSearchPage(container, query, initialFilter = "all") {
  const filter = normalizeFilter(initialFilter);
  const renderToken = Symbol("search-render");
  const state = {
    items: [],
    page: 0,
    totalPages: 1,
    requestId: 0
  };

  container.searchRenderToken = renderToken;
  container.classList.remove("explore-shell");
  container.innerHTML = searchMarkup(query, filter);

  const setFilter = (nextFilter) => {
    const params = new URLSearchParams(window.location.search);
    params.set("q", query);
    params.set("type", nextFilter);
    window.history.pushState({}, "", `/search?${params.toString()}`);
    renderSearchPage(container, query, nextFilter);
  };

  container.querySelectorAll("[data-search-filter]").forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.searchFilter));
  });

  const loadPage = async (page, append = false) => {
    const requestId = ++state.requestId;
    const grid = container.querySelector("#search-results-grid");
    const footer = container.querySelector("#search-page-footer");

    if (!append) {
      grid.innerHTML = loadingCards(12);
      footer.innerHTML = "";
    } else {
      const button = footer.querySelector("[data-load-more]");
      if (button) {
        button.disabled = true;
        button.textContent = "Loading...";
      }
    }

    try {
      const response = await searchMedia(query, page);

      if (container.searchRenderToken !== renderToken || requestId !== state.requestId) {
        return;
      }

      const existingKeys = new Set(state.items.map((item) => `${item.type}:${item.id}`));
      state.items = append
        ? [...state.items, ...response.items.filter((item) => !existingKeys.has(`${item.type}:${item.id}`))]
        : response.items;
      state.page = response.page;
      state.totalPages = response.totalPages;
      renderResults(container, state.items, filter);
      renderLoadMore(container, state, () => loadPage(state.page + 1, true));
    } catch (error) {
      if (container.searchRenderToken !== renderToken || requestId !== state.requestId) {
        return;
      }

      grid.innerHTML = errorState("Could not complete your search.", "search");
      footer.innerHTML = "";
      console.error(`Unable to search for "${query}".`, error);

      grid.querySelector("[data-retry]").addEventListener("click", () => loadPage(state.page || 1));
    }
  };

  await loadPage(1);
}
