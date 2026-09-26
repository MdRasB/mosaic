export function emptyState(message = "No content available right now.") {
  return `<div class="explore-state explore-state-empty">${message}</div>`;
}

export function errorState(message, retryId) {
  return `
    <div class="explore-state explore-state-error">
      <p>${message}</p>
      <button class="button button-secondary" type="button" data-retry="${retryId}">Retry</button>
    </div>
  `;
}
