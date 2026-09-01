import * as dom from "./dom.js";
import { t } from "./i18n-ui.js";

export function renderLiveBrowserClients(count) {
  if (!dom.liveBrowserClients) {
    return;
  }
  const value = typeof count === "number" && count >= 0 ? String(count) : "—";
  dom.liveBrowserClients.textContent = t("live.browserClientsCount", { count: value });
}

export function renderLiveDiagnostics(payload) {
  if (!payload) {
    return;
  }
  renderLiveBrowserClients(payload.websocket_clients);
}
