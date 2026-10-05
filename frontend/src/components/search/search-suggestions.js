import { imageUrl, searchSuggestions } from "../../api/tmdb.js";
import { debounce } from "../../utils/debounce.js";
import { escapeHtml } from "../../utils/escape-html.js";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_DELAY = 250;

function getYear(date) {
  return date ? new Date(`${date}T00:00:00`).getFullYear() : "—";
}

function getTypeLabel(type) {
  return type === "tv" ? "TV Show" : "Movie";
}

function highlightMatch(title, query) {
  const matchIndex = title.toLowerCase().indexOf(query.toLowerCase());

  if (matchIndex === -1) {
    return escapeHtml(title);
  }

  const matchEnd = matchIndex + query.length;
  return [
    escapeHtml(title.slice(0, matchIndex)),
    `<mark class="search-suggestion-match">${escapeHtml(title.slice(matchIndex, matchEnd))}</mark>`,
    escapeHtml(title.slice(matchEnd))
  ].join("");
}

function suggestionMarkup(item, query, index) {
  const poster = imageUrl(item.posterPath, "w92");

  return `
    <li
      class="search-suggestion"
      id="search-suggestion-${index}"
      role="option"
      aria-selected="false"
      data-suggestion-index="${index}"
    >
      <span class="search-suggestion-poster">
        ${poster
          ? `<img src="${poster}" alt="" loading="lazy" />`
          : `<span class="search-suggestion-poster-fallback">${escapeHtml(getTypeLabel(item.type))}</span>`}
      </span>
      <span class="search-suggestion-text">
        <span class="search-suggestion-title">${highlightMatch(item.title, query)}</span>
        <span class="search-suggestion-meta">${escapeHtml(getTypeLabel(item.type))} · ${getYear(item.releaseDate)}</span>
      </span>
    </li>
  `;
}

export function createSearchSuggestions({ input, form, onSelect }) {
  const list = document.createElement("ul");
  list.className = "search-suggestions";
  list.id = "search-suggestions";
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Search suggestions");
  list.hidden = true;
  form.append(list);

  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", list.id);

  const state = {
    items: [],
    activeIndex: -1,
    requestId: 0
  };

  const setActiveIndex = (nextIndex) => {
    state.activeIndex = nextIndex;
    const options = list.querySelectorAll("[data-suggestion-index]");

    options.forEach((option, index) => {
      const isActive = index === nextIndex;
      option.classList.toggle("is-active", isActive);
      option.setAttribute("aria-selected", String(isActive));
    });

    if (nextIndex === -1) {
      input.removeAttribute("aria-activedescendant");
      return;
    }

    const activeOption = options[nextIndex];
    if (activeOption) {
      input.setAttribute("aria-activedescendant", activeOption.id);
      activeOption.scrollIntoView({ block: "nearest" });
    }
  };

  const closeSuggestions = () => {
    state.items = [];
    setActiveIndex(-1);
    list.innerHTML = "";
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
  };

  const renderSuggestions = (items, query) => {
    if (!items.length) {
      closeSuggestions();
      return;
    }

    state.items = items;
    list.innerHTML = items.map((item, index) => suggestionMarkup(item, query, index)).join("");
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    setActiveIndex(-1);
  };

  const loadSuggestions = async (query) => {
    const requestId = ++state.requestId;

    try {
      const items = await searchSuggestions(query);

      if (requestId !== state.requestId || input.value.trim() !== query) {
        return;
      }

      renderSuggestions(items, query);
    } catch (error) {
      if (requestId !== state.requestId) {
        return;
      }

      closeSuggestions();
      console.error("Unable to load search suggestions.", error);
    }
  };

  const queueSuggestions = debounce((query) => {
    if (query.length >= MIN_QUERY_LENGTH) {
      loadSuggestions(query);
    }
  }, DEBOUNCE_DELAY);

  const selectSuggestion = (index) => {
    const item = state.items[index];

    if (!item) {
      return;
    }

    closeSuggestions();
    onSelect(item);
  };

  input.addEventListener("input", () => {
    const query = input.value.trim();

    if (query.length < MIN_QUERY_LENGTH) {
      state.requestId += 1;
      closeSuggestions();
      return;
    }

    queueSuggestions(query);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSuggestions();
      return;
    }

    if (list.hidden || !state.items.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((state.activeIndex + 1) % state.items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(state.activeIndex <= 0 ? state.items.length - 1 : state.activeIndex - 1);
    } else if (event.key === "Enter" && state.activeIndex !== -1) {
      event.preventDefault();
      selectSuggestion(state.activeIndex);
    }
  });

  input.addEventListener("focus", () => {
    if (state.items.length && input.value.trim().length >= MIN_QUERY_LENGTH) {
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }
  });

  list.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  list.addEventListener("click", (event) => {
    const option = event.target.closest("[data-suggestion-index]");

    if (option) {
      selectSuggestion(Number(option.dataset.suggestionIndex));
    }
  });

  form.addEventListener("submit", closeSuggestions);

  document.addEventListener("click", (event) => {
    if (!form.contains(event.target)) {
      closeSuggestions();
    }
  });

  return { close: closeSuggestions };
}