import { appendText } from '/shared/chat-render.js?v=12';
import * as dom from './dom.js';
import { state } from './state.js';
import { PROVIDER_LABELS } from './constants.js';
import { createErrorDetailTrigger, hideErrorPopover } from './ui-error-popover.js';
import { showBanner } from './ui-shell.js';

export function renderPlatformStatus(el, platform) {
    const state = typeof platform.state === "string" ? platform.state : "unknown";
    el.textContent = state.replace(/_/g, " ");
    el.className = "status-pill status-pill--" + state;
  }

export function formatMessageCount(count) {
    if (typeof count !== "number" || count < 0) {
      return "";
    }
    if (count === 0) {
      return "";
    }
    return " · " + String(count) + " msg";
  }

export function platformSummaryText(platform) {
    const parts = [];
    if (typeof platform.detail === "string" && platform.detail !== "") {
      parts.push(platform.detail);
    }
    const countSuffix = formatMessageCount(platform.message_count);
    if (countSuffix !== "") {
      parts.push("Received" + countSuffix);
    }
    return parts.join(" ");
  }

export function renderPlatformDetail(el, platform, platformLabel) {
    const summary = platformSummaryText(platform);
    const lastError =
      typeof platform.last_error === "string" ? platform.last_error.trim() : "";
    if (!el) {
      return;
    }
    const renderKey = summary + "\0" + lastError;
    if (el.dataset.renderKey === renderKey) {
      return;
    }
    if (state.activeErrorTrigger && el.contains(state.activeErrorTrigger)) {
      hideErrorPopover();
    }

    el.dataset.renderKey = renderKey;
    el.replaceChildren();
    if (summary !== "") {
      const summaryText = document.createElement("span");
      summaryText.className = "status-detail__summary";
      summaryText.textContent = summary;
      el.appendChild(summaryText);
    }
    if (lastError !== "") {
      el.appendChild(createErrorDetailTrigger(lastError, platformLabel));
    }
    el.hidden = summary === "" && lastError === "";
  }

export function renderStatus(status) {
    const twitch = status.twitch || {};
    renderPlatformStatus(dom.twitchStatus, twitch);
    renderPlatformDetail(dom.twitchDetail, twitch, "Twitch");

    const youtube = status.youtube || {};
    renderPlatformStatus(dom.youtubeStatus, youtube);

    if (youtube.connection_mode === "page") {
      if (youtube.channel) {
        dom.youtubeOAuthLabel.textContent = "Simple · @" + youtube.channel;
      } else if (youtube.video_id) {
        dom.youtubeOAuthLabel.textContent = "Simple · " + youtube.video_id;
      } else {
        dom.youtubeOAuthLabel.textContent = "Simple (channel or video URL)";
      }
      if (dom.youtubeConnect) {
        dom.youtubeConnect.hidden = true;
      }
    } else {
      if (youtube.oauth_connected) {
        dom.youtubeOAuthLabel.textContent = "API · Connected";
      } else {
        dom.youtubeOAuthLabel.textContent = "API · Not connected";
      }
      if (dom.youtubeConnect) {
        dom.youtubeConnect.hidden = false;
      }
    }

    renderPlatformDetail(dom.youtubeDetail, youtube, "YouTube");

    const vk = status.vk || {};
    renderPlatformStatus(dom.vkStatus, vk);
    renderPlatformDetail(dom.vkDetail, vk, "VK Live");
  }

export function formatUptime(seconds) {
    if (typeof seconds !== "number" || seconds < 0) {
      return "-";
    }
    if (seconds < 60) {
      return String(seconds) + "s";
    }
    const minutes = Math.floor(seconds / 60);
    const rem = seconds % 60;
    if (minutes < 60) {
      return String(minutes) + "m " + String(rem) + "s";
    }
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return String(hours) + "h " + String(remMinutes) + "m";
  }

export function formatMessageCounts(counts) {
    if (!counts || typeof counts !== "object") {
      return "None yet";
    }
    const entries = Object.keys(counts)
      .sort()
      .map(function (platform) {
        return platform + ": " + String(counts[platform]);
      });
    if (entries.length === 0) {
      return "None yet";
    }
    return entries.join(", ");
  }

export function formatRefreshTime(value) {
    if (typeof value !== "string" || value === "") {
      return "Never";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Never";
    }
    return date.toLocaleString();
  }

export function renderEmoteDiagnostics(emoteCache) {
    if (!emoteCache) {
      if (dom.emoteCacheEntries) {
        dom.emoteCacheEntries.textContent = "-";
      }
      if (dom.emoteProviderList) {
        if (state.activeErrorTrigger && dom.emoteProviderList.contains(state.activeErrorTrigger)) {
          hideErrorPopover();
        }
        dom.emoteProviderList.dataset.renderKey = "";
        dom.emoteProviderList.textContent = "";
      }
      return;
    }

    if (dom.emoteCacheEntries) {
      const total = emoteCache.total_entries;
      const scopes = emoteCache.total_scopes;
      if (typeof total === "number" && typeof scopes === "number") {
        dom.emoteCacheEntries.textContent = String(total) + " emotes · " + String(scopes) + " scopes";
      } else {
        dom.emoteCacheEntries.textContent = "-";
      }
    }

    if (!dom.emoteProviderList) {
      return;
    }

    const renderKey = JSON.stringify(emoteCache);
    if (dom.emoteProviderList.dataset.renderKey === renderKey) {
      return;
    }
    if (state.activeErrorTrigger && dom.emoteProviderList.contains(state.activeErrorTrigger)) {
      hideErrorPopover();
    }
    dom.emoteProviderList.dataset.renderKey = renderKey;
    dom.emoteProviderList.textContent = "";
    const providers = emoteCache.providers || {};
    const keys = Object.keys(providers).sort();
    if (keys.length === 0) {
      const empty = document.createElement("li");
      empty.className = "provider-list__item provider-list__item--empty";
      appendText(empty, "No provider data yet.");
      dom.emoteProviderList.appendChild(empty);
      return;
    }

    keys.forEach(function (key) {
      const snap = providers[key] || {};
      const item = document.createElement("li");
      item.className = "provider-list__item";

      const title = document.createElement("div");
      title.className = "provider-list__title";
      appendText(title, PROVIDER_LABELS[key] || key);

      const stats = document.createElement("div");
      stats.className = "provider-list__stats";
      const count =
        typeof snap.emote_count === "number" ? String(snap.emote_count) : "0";
      appendText(stats, count + " emotes · refreshed " + formatRefreshTime(snap.last_refresh_at));

      item.appendChild(title);
      item.appendChild(stats);

      if (typeof snap.last_error === "string" && snap.last_error !== "") {
        item.appendChild(
          createErrorDetailTrigger(snap.last_error, (PROVIDER_LABELS[key] || key) + " emotes")
        );
      }

      dom.emoteProviderList.appendChild(item);
    });
  }

export function renderDiagnostics(payload) {
    if (!payload) {
      return;
    }
    if (dom.diagUptime) {
      dom.diagUptime.textContent = formatUptime(payload.uptime_seconds);
    }
    if (dom.diagWsClients) {
      const clients = payload.websocket_clients;
      dom.diagWsClients.textContent =
        typeof clients === "number" ? String(clients) : "-";
    }
    if (dom.diagMessageCounts) {
      dom.diagMessageCounts.textContent = formatMessageCounts(payload.message_counts);
    }
    if (payload.connectors) {
      renderStatus(payload.connectors);
    }
    renderEmoteDiagnostics(payload.emote_cache);
  }

export function handleOAuthQuery() {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get("oauth");
    const oauthError = params.get("oauth_error");

    if (oauth === "success") {
      showBanner("success", "YouTube connected. Enable the connector and save settings.");
    } else if (oauthError) {
      const messages = {
        denied: "YouTube authorization was denied.",
        not_configured: "Set OAuth client ID and secret, save, then connect again.",
        exchange_failed: "YouTube token exchange failed — check credentials and redirect URI.",
      };
      showBanner("error", messages[oauthError] || "YouTube authorization failed.");
    }

    if (oauth || oauthError) {
      params.delete("oauth");
      params.delete("oauth_error");
      const query = params.toString();
      const next = window.location.pathname + (query ? "?" + query : "");
      window.history.replaceState({}, "", next);
    }
  }
