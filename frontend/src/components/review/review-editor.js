import { reviewService } from "../../reviews/review-service.js";

const MIN_BODY = 20;
const MAX_BODY = 5000;
const MAX_TITLE = 120;

/**
 * Review editor.
 *
 * Layout follows the project's review reference: optional title, the review body
 * with a live counter, visibility, spoiler flag and the submit action. New
 * reviews use the upsert endpoint; editing an existing review uses PATCH so the
 * media identity never has to be re-supplied.
 *
 * @param {object} options
 * @param {object} options.media   Media identity payload for a new review.
 * @param {object|null} options.review Existing review, if editing.
 * @param {Function} [options.onSaved]
 * @param {Function} [options.onDeleted]
 */
export function createReviewEditor({ media, review = null, onSaved, onDeleted } = {}) {
  let current = review ? { ...review } : null;
  let busy = false;

  const element = document.createElement("form");
  element.className = "review-editor";
  element.noValidate = true;
  element.setAttribute("aria-label", current ? "Edit your review" : "Write a review");
  element.innerHTML = `
    <div class="review-editor-heading">
      <p class="eyebrow">Your review</p>
      <h3 data-heading>${current ? "Edit your review" : "Write a review"}</h3>
    </div>
    <label class="review-field">
      <span class="field-label">Review title (optional)</span>
      <input class="input review-title" type="text" name="title" maxlength="${MAX_TITLE}"
        placeholder="Give your review a title" data-title>
    </label>
    <div class="review-body-row">
      <span class="field-label" id="review-body-label">Your review</span>
      <span class="review-counter" data-counter>0/${MAX_BODY}</span>
    </div>
    <textarea class="input review-body" rows="6" placeholder="Write your thoughts about this title..."
      aria-labelledby="review-body-label" data-body></textarea>
    <fieldset class="review-visibility">
      <legend class="field-label">Visibility</legend>
      <label class="review-choice">
        <input type="radio" name="review-visibility" value="private" data-visibility="private" checked>
        <span>Private</span>
      </label>
      <label class="review-choice">
        <input type="radio" name="review-visibility" value="public" data-visibility="public">
        <span>Public</span>
      </label>
    </fieldset>
    <label class="review-spoiler">
      <input type="checkbox" data-spoilers>
      <span>This review contains spoilers</span>
    </label>
    <button class="button button-primary review-submit" type="submit" data-submit>Publish review</button>
    <button class="button button-ghost review-delete" type="button" data-delete hidden>Delete review</button>
    <p class="review-status" role="status" aria-live="polite" data-status></p>
  `;

  const titleInput = element.querySelector("[data-title]");
  const bodyInput = element.querySelector("[data-body]");
  const counter = element.querySelector("[data-counter]");
  const visibilityInputs = [...element.querySelectorAll("[data-visibility]")];
  const spoilerInput = element.querySelector("[data-spoilers]");
  const submitButton = element.querySelector("[data-submit]");
  const deleteButton = element.querySelector("[data-delete]");
  const status = element.querySelector("[data-status]");
  const heading = element.querySelector("[data-heading]");

  function setStatus(message, tone = "") {
    status.textContent = message;
    status.className = tone ? `review-status review-status-${tone}` : "review-status";
  }

  function selectedVisibility() {
    return visibilityInputs.find((input) => input.checked)?.value ?? "private";
  }

  function formValues() {
    return {
      title: titleInput.value.trim(),
      body: bodyInput.value.trim(),
      visibility: selectedVisibility(),
      contains_spoilers: spoilerInput.checked
    };
  }

  function isDirty() {
    if (!current) {
      const values = formValues();
      return values.body !== "" || values.title !== "" ||
        values.visibility !== "private" || values.contains_spoilers;
    }
    const values = formValues();
    return values.title !== (current.title ?? "") ||
      values.body !== current.body ||
      values.visibility !== current.visibility ||
      values.contains_spoilers !== Boolean(current.contains_spoilers);
  }

  function paint() {
    const length = bodyInput.value.length;
    counter.textContent = `${length}/${MAX_BODY}`;
    counter.classList.toggle("is-danger", length > MAX_BODY);
    const bodyLength = bodyInput.value.trim().length;
    const valid = bodyLength >= MIN_BODY && bodyLength <= MAX_BODY;
    submitButton.disabled = busy || !valid || !isDirty();
    deleteButton.hidden = !current;
    deleteButton.disabled = busy;
    element.setAttribute("aria-busy", String(busy));
  }

  function load(review) {
    current = review;
    if (!review) {
      element.reset();
      setStatus("");
      paint();
      return;
    }
    titleInput.value = review.title ?? "";
    bodyInput.value = review.body ?? "";
    visibilityInputs.forEach((input) => {
      input.checked = input.value === review.visibility;
    });
    spoilerInput.checked = Boolean(review.contains_spoilers);
    heading.textContent = "Edit your review";
    element.setAttribute("aria-label", "Edit your review");
    setStatus("");
    paint();
  }

  function handleInput() {
    setStatus("");
    paint();
  }

  titleInput.addEventListener("input", handleInput);
  bodyInput.addEventListener("input", handleInput);
  spoilerInput.addEventListener("change", handleInput);
  visibilityInputs.forEach((input) => input.addEventListener("change", handleInput));

  element.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;

    const values = formValues();
    if (values.body.length < MIN_BODY) {
      setStatus(`Your review must be at least ${MIN_BODY} characters.`, "error");
      bodyInput.focus();
      return;
    }
    if (values.body.length > MAX_BODY) {
      setStatus(`Your review must be at most ${MAX_BODY} characters.`, "error");
      bodyInput.focus();
      return;
    }
    if (values.title.length > MAX_TITLE) {
      setStatus(`Your review title must be at most ${MAX_TITLE} characters.`, "error");
      titleInput.focus();
      return;
    }

    const payload = {
      title: values.title === "" ? null : values.title,
      body: values.body,
      visibility: values.visibility,
      contains_spoilers: values.contains_spoilers
    };

    busy = true;
    setStatus(current ? "Saving your changes…" : "Publishing your review…");
    paint();
    try {
      const saved = current
        ? await reviewService.update(current.id, payload)
        : await reviewService.saveForMedia(media, payload);
      current = saved;
      heading.textContent = "Edit your review";
      element.setAttribute("aria-label", "Edit your review");
      setStatus(
        saved.visibility === "public"
          ? "Review published. It is now visible to everyone."
          : "Review saved as private. Only you can see it.",
        "success"
      );
      onSaved?.(saved);
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      busy = false;
      paint();
    }
  });

  deleteButton.addEventListener("click", async () => {
    if (busy || !current) return;
    const title = current.media?.title ?? media?.title ?? "this title";
    if (!window.confirm(`Delete your review of “${title}”? This cannot be undone.`)) return;

    busy = true;
    setStatus("Deleting your review…");
    paint();
    try {
      await reviewService.remove(current.id);
      current = null;
      element.reset();
      heading.textContent = "Write a review";
      element.setAttribute("aria-label", "Write a review");
      setStatus("Review deleted.", "success");
      onDeleted?.();
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      busy = false;
      paint();
    }
  });

  load(current);
  return {
    element,
    refresh(review) {
      load(review);
    }
  };
}
