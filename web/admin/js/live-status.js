import * as dom from "./dom.js";
import { renderPlatformStatus } from "./status.js";
import { t } from "./i18n-ui.js";

export function renderLiveBrowserClients(count) {
  if (!dom.liveBrowserClients) {
    return;
  }
  const value = typeof count === "number" && count >= 0 ? String(count) : "—";
  dom.liveBrowserClients.textContent = t("live.browserClientsCount", { count: value });
}

export function renderLiveConnectorStrip(status) {
  if (!status || typeof status !== "object") {
    return;
  }
  if (dom.liveTwitchStatus) {
    renderPlatformStatus(dom.liveTwitchStatus, status.twitch || {});
  }
  if (dom.liveYoutubeStatus) {
    renderPlatformStatus(dom.liveYoutubeStatus, status.youtube || {});
  }
  if (dom.liveVkStatus) {
    renderPlatformStatus(dom.liveVkStatus, status.vk || {});
  }
}

export function renderLiveDiagnostics(payload) {
  if (!payload) {
    return;
  }
  renderLiveBrowserClients(payload.websocket_clients);
  if (payload.connectors) {
    renderLiveConnectorStrip(payload.connectors);
  }
}
