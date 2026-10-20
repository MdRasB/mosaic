import { statusLabel, statusOptionsMarkup } from "../../status/status-config.js";

export function renderStatusSelect(select, currentStatus) {
  select.innerHTML = statusOptionsMarkup(currentStatus);
  select.value = currentStatus;
  select.setAttribute("aria-label", `Tracking status: ${statusLabel(currentStatus)}`);
}
