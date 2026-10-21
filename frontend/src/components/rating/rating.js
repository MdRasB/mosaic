import { ratingService } from "../../ratings/rating-service.js";

const MIN_RATING = 1;
const MAX_RATING = 10;
const STEP = 0.5;
const NEUTRAL_RATING = 5;

const format = (value) => Number(value).toFixed(1);

const clamp = (value) => Math.min(MAX_RATING, Math.max(MIN_RATING, Math.round(value * 2) / 2));

/**
 * Personal rating control.
 *
 * The layout follows the project's rating reference: an external TMDB score, the
 * user's own score, a half-point stepper and a save action. The component owns
 * only the draft value; the server response is the source of truth for the
 * confirmed value.
 *
 * @param {object} options
 * @param {object} options.media          Media identity payload for the API.
 * @param {number|null} options.rating    Confirmed rating, if any.
 * @param {number} options.tmdbRating     External TMDB score, shown read-only.
 * @param {Function} [options.onSaved]    Called with the updated item.
 */
export function createRatingControl({ media, rating = null, itemId = null, tmdbRating = 0, onSaved } = {}) {
  let confirmed = typeof rating === "number" ? rating : null;
  let draft = confirmed ?? NEUTRAL_RATING;
  let relationshipId = itemId;
  let busy = false;

  const element = document.createElement("section");
  element.className = "rating-panel";
  element.setAttribute("aria-label", "Your rating");
  element.innerHTML = `
    <div class="rating-panel-heading">
      <p class="eyebrow">Your score</p>
      <h3>Rate this title</h3>
    </div>
    <dl class="rating-panel-metrics">
      <div class="rating-metric">
        <dt>TMDB rating</dt>
        <dd class="rating-metric-external" data-tmdb-rating></dd>
      </div>
      <div class="rating-metric">
        <dt>Your rating</dt>
        <dd class="rating-metric-personal" data-rating-readout></dd>
      </div>
    </dl>
    <div class="rating-stepper" role="group" aria-label="Choose your rating from 1 to 10 in half-point steps" tabindex="0" data-rating-stepper>
      <button class="rating-step" type="button" data-rating-step="-1" aria-label="Decrease rating by 0.5">‹</button>
      <p class="rating-stepper-value" aria-live="polite">
        <span data-rating-value>5.0</span><span class="rating-stepper-scale">/ 10</span>
      </p>
      <button class="rating-step" type="button" data-rating-step="1" aria-label="Increase rating by 0.5">›</button>
    </div>
    <button class="button button-primary rating-save" type="button" data-rating-save>Save rating</button>
    <button class="rating-clear" type="button" data-rating-clear hidden>Remove rating</button>
    <p class="rating-status" role="status" aria-live="polite" data-rating-status></p>
  `;

  const readout = element.querySelector("[data-rating-readout]");
  const tmdbReadout = element.querySelector("[data-tmdb-rating]");
  const value = element.querySelector("[data-rating-value]");
  const stepper = element.querySelector("[data-rating-stepper]");
  const decrease = element.querySelector('[data-rating-step="-1"]');
  const increase = element.querySelector('[data-rating-step="1"]');
  const saveButton = element.querySelector("[data-rating-save]");
  const clearButton = element.querySelector("[data-rating-clear]");
  const status = element.querySelector("[data-rating-status]");

  tmdbReadout.textContent = tmdbRating > 0 ? `${format(tmdbRating)} / 10` : "Not rated";

  function setStatus(message, tone = "") {
    status.textContent = message;
    status.className = tone ? `rating-status rating-status-${tone}` : "rating-status";
  }

  function paint() {
    readout.textContent = confirmed === null ? "Not rated" : `${format(confirmed)} / 10`;
    value.textContent = format(draft);
    decrease.disabled = busy || draft <= MIN_RATING;
    increase.disabled = busy || draft >= MAX_RATING;
    saveButton.disabled = busy || (confirmed !== null && confirmed === draft);
    saveButton.textContent = confirmed !== null && confirmed !== draft ? "Update rating" : "Save rating";
    clearButton.hidden = confirmed === null;
    clearButton.disabled = busy;
    element.setAttribute("aria-busy", String(busy));
  }

  function setDraft(next) {
    const clamped = clamp(next);
    if (clamped === draft) return;
    draft = clamped;
    setStatus("");
    paint();
  }

  function step(direction) {
    if (busy) return;
    setDraft(draft + direction * STEP);
  }

  decrease.addEventListener("click", () => step(-1));
  increase.addEventListener("click", () => step(1));

  stepper.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      step(1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setDraft(MIN_RATING);
    } else if (event.key === "End") {
      event.preventDefault();
      setDraft(MAX_RATING);
    }
  });

  async function save() {
    if (busy) return;
    const previous = confirmed;
    const attempted = draft;
    busy = true;
    setStatus("Saving your rating…");
    paint();
    try {
      const saved = await ratingService.setForMedia(media, attempted);
      relationshipId = saved.id;
      confirmed = typeof saved.rating === "number" ? saved.rating : null;
      draft = confirmed ?? attempted;
      setStatus(`Saved. Your rating is ${format(confirmed)}/10.`, "success");
      onSaved?.(saved);
    } catch (error) {
      // Roll the confirmed value back so the readout never shows an unsaved score.
      confirmed = previous;
      setStatus(error.message, "error");
    } finally {
      busy = false;
      paint();
    }
  }

  async function clear() {
    if (busy) return;
    if (confirmed === null) {
      draft = NEUTRAL_RATING;
      paint();
      return;
    }
    busy = true;
    setStatus("Removing your rating…");
    paint();
    try {
      await ratingService.remove(relationshipId);
      confirmed = null;
      draft = NEUTRAL_RATING;
      setStatus("Rating removed.", "success");
      onSaved?.(null);
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      busy = false;
      paint();
    }
  }

  saveButton.addEventListener("click", save);
  clearButton.addEventListener("click", clear);

  paint();

  return {
    element,
    get rating() {
      return confirmed;
    },
    refresh(item) {
      relationshipId = item?.id ?? relationshipId;
      confirmed = typeof item?.rating === "number" ? item.rating : null;
      draft = confirmed ?? NEUTRAL_RATING;
      paint();
    }
  };
}
