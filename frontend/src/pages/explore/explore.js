import {
  getPopularMovies,
  getPopularTv,
  getTopRated,
  getTrending,
  getUpcoming,
  imageUrl
} from "../../api/tmdb.js";
import { emptyState, errorState } from "../../components/empty-state/empty-state.js";
import { loadingCards, mediaRow } from "../../components/media-row/media-row.js";

const sections = [
  { id: "trending", title: "Trending now", load: getTrending },
  { id: "popular-movies", title: "Popular movies", load: getPopularMovies },
  { id: "popular-tv", title: "Popular TV shows", load: getPopularTv },
  { id: "top-rated", title: "Top rated", load: getTopRated },
  { id: "upcoming", title: "Upcoming", load: getUpcoming }
];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function exploreMarkup() {
  return `
    <section class="explore-page" aria-labelledby="explore-title">
      <div class="explore-intro">
        <p class="eyebrow">Public discovery</p>
        <h1 id="explore-title">Find your next <span>favorite world.</span></h1>
        <p class="hero-copy">Browse what people are watching, discovering, and talking about right now.</p>
      </div>
      <section class="featured-media" id="featured-media" aria-label="Featured media">
        <div class="featured-loading">${loadingCards(1)}</div>
      </section>
      <div class="explore-sections">
        ${sections.map(({ id, title }) => `
          <section class="media-section" aria-labelledby="${id}-title">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Mosaic picks</p>
                <h2 id="${id}-title">${title}</h2>
              </div>
              <span class="section-status" id="${id}-status">Loading</span>
            </div>
            <div class="media-row-shell">
              <button class="row-control" type="button" data-row-control="previous" data-row="${id}" aria-label="Show previous ${title} titles">‹</button>
              <div class="media-row" id="${id}-row">${loadingCards()}</div>
              <button class="row-control" type="button" data-row-control="next" data-row="${id}" aria-label="Show more ${title} titles">›</button>
            </div>
          </section>
        `).join("")}
      </div>
    </section>
  `;
}

function featuredMarkup(media) {
  const backdrop = imageUrl(media.backdropPath, "w1280");
  const routeType = media.type === "multi" ? "multi" : media.type;
  const title = escapeHtml(media.title);

  return `
    <div class="featured-media-background" style="--featured-image: url('${backdrop}')"></div>
    <div class="featured-media-content">
      <p class="eyebrow">Featured this week</p>
      <h2>${title}</h2>
      <p>${escapeHtml(media.overview || "Discover more details about this title.")}</p>
      <div class="featured-meta">
        <span class="rating">★ ${media.rating.toFixed(1)}</span>
        <span>${media.releaseDate || "Release date unavailable"}</span>
      </div>
      <a class="button button-primary" href="/media/${routeType}/${media.id}">View details</a>
    </div>
  `;
}

function setSectionError(section, message) {
  document.querySelector(`#${section.id}-row`).innerHTML = errorState(message, section.id);
  document.querySelector(`#${section.id}-status`).textContent = "Unavailable";
}

async function loadSection(section) {
  const row = document.querySelector(`#${section.id}-row`);
  const status = document.querySelector(`#${section.id}-status`);

  row.innerHTML = loadingCards();
  status.textContent = "Loading";

  try {
    const items = await section.load();
    row.innerHTML = items.length ? mediaRow(items.slice(0, 10)) : emptyState();
    status.textContent = items.length ? `${items.length} titles` : "No results";
  } catch (error) {
    setSectionError(section, "Could not load this section.");
    console.error(`Unable to load ${section.id}.`, error);
  }
}

async function loadFeatured() {
  const container = document.querySelector("#featured-media");

  try {
    const items = await getTrending();
    const featured = items.find((item) => item.backdropPath) ?? items[0];
    container.innerHTML = featured ? featuredMarkup(featured) : emptyState();
  } catch (error) {
    container.innerHTML = errorState("Could not load featured media.", "featured");
    console.error("Unable to load featured media.", error);
  }
}

function bindRetryHandlers(container) {
  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-retry]");

    if (!button) {
      return;
    }

    if (button.dataset.retry === "featured") {
      loadFeatured();
      return;
    }

    const section = sections.find((item) => item.id === button.dataset.retry);
    if (section) {
      loadSection(section);
    }
  });
}

function updateRowControls(rowShell) {
  const row = rowShell.querySelector(".media-row");
  const previous = rowShell.querySelector("[data-row-control='previous']");
  const next = rowShell.querySelector("[data-row-control='next']");
  const hasOverflow = row.scrollWidth > row.clientWidth + 1;

  previous.disabled = !hasOverflow || row.scrollLeft <= 1;
  next.disabled = !hasOverflow || row.scrollLeft + row.clientWidth >= row.scrollWidth - 1;
}

function bindRowControls(container) {
  container.querySelectorAll(".media-row-shell").forEach((rowShell) => {
    const row = rowShell.querySelector(".media-row");
    const step = () => row.clientWidth * 0.86;

    rowShell.querySelectorAll("[data-row-control]").forEach((button) => {
      button.addEventListener("click", () => {
        const direction = button.dataset.rowControl === "next" ? 1 : -1;
        row.scrollBy({ left: direction * step(), behavior: "smooth" });
      });
    });

    row.addEventListener("scroll", () => updateRowControls(rowShell), { passive: true });
    updateRowControls(rowShell);
  });

  window.addEventListener("resize", () => {
    container.querySelectorAll(".media-row-shell").forEach(updateRowControls);
  });
}

export async function renderExplorePage(container) {
  container.classList.add("explore-shell");
  container.innerHTML = exploreMarkup();
  await Promise.all([loadFeatured(), ...sections.map(loadSection)]);
  bindRetryHandlers(container);
  bindRowControls(container);
}
