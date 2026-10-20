export const STATUS_OPTIONS = [
  ["watchlist", "Planned"],
  ["watching", "In Progress"],
  ["completed", "Completed"],
  ["paused", "Paused"],
  ["dropped", "Dropped"]
];

export function statusLabel(value) {
  return STATUS_OPTIONS.find(([status]) => status === value)?.[1] ?? "Not tracking";
}

export function statusOptionsMarkup(current) {
  return STATUS_OPTIONS
    .map(([status, label]) => `<option value="${status}" ${status === current ? "selected" : ""}>${label}</option>`)
    .join("");
}
