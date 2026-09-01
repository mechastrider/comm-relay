import { appendText } from '/shared/chat-render.js?v=12';
import { translatePlatformState } from '/shared/i18n.js?v=16';
import * as dom from './dom.js';
import { state } from './state.js';
import { PROVIDER_LABELS } from './constants.js';
import { createErrorDetailTrigger, hideErrorPopover } from './ui-error-popover.js';
import { showBanner } from './ui-shell.js';
import { renderAboutVersion } from './about.js';
import { t, rememberDiagnosticsPayload } from './i18n-ui.js';
import { renderLiveDiagnostics } from './live-status.js';

export function renderPlatformStatus(el, platform) {
    const platformState = typeof platform.state === "string" ? platform.state : "unknown";
    el.textContent = translatePlatformState(platformState);
    el.className = "status-pill status-pill--" + platformState;
  }

export function formatMessageCount(count) {
    if (typeof count !== "number" || count < 0) {
      return "";
    }
    if (count === 0) {
      return "";
    }
    return " · " + String(count) + " " + t("status.msgSuffix");
  }

export function platformSummaryText(platform) {
    const parts = [];
    if (typeof platform.detail === "string" && platform.detail !== "") {
      parts.push(platform.detail);
    }
    const countSuffix = formatMessageCount(platform.message_count);
    if (countSuffix !== "") {
      parts.push(t("status.received") + countSuffix);
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
    state.youtubeOAuthConnected = Boolean(youtube.oauth_connected);

    if (youtube.connection_mode === "page") {
      if (youtube.channel) {
        if (dom.youtubeOAuthLabel) {
          dom.youtubeOAuthLabel.textContent = t("status.simpleChannel", { channel: youtube.channel });
        }
      } else if (youtube.video_id) {
        if (dom.youtubeOAuthLabel) {
          dom.youtubeOAuthLabel.textContent = t("status.simpleVideo", { id: youtube.video_id });
        }
      } else if (dom.youtubeOAuthLabel) {
        dom.youtubeOAuthLabel.textContent = t("status.simpleFallback");
      }
      if (dom.youtubeConnect) {
        dom.youtubeConnect.hidden = true;
      }
    } else {
      if (youtube.oauth_connected) {
        if (dom.youtubeOAuthLabel) {
          dom.youtubeOAuthLabel.textContent = t("status.apiConnected");
        }
      } else if (dom.youtubeOAuthLabel) {
        dom.youtubeOAuthLabel.textContent = t("status.apiNotConnected");
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
      return t("status.noneYet");
    }
    const entries = Object.keys(counts)
      .sort()
      .map(function (platform) {
        return platform + ": " + String(counts[platform]);
      });
    if (entries.length === 0) {
      return t("status.noneYet");
    }
    return entries.join(", ");
  }

export function formatRefreshTime(value) {
    if (typeof value !== "string" || value === "") {
      return t("status.never");
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return t("status.never");
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
        dom.emoteCacheEntries.textContent = t("status.emotesScopes", {
          total: String(total),
          scopes: String(scopes),
        });
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
      appendText(empty, t("status.noProviderData"));
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
      appendText(
        stats,
        t("status.emotesRefreshed", {
          count: count,
          time: formatRefreshTime(snap.last_refresh_at),
        })
      );

      item.appendChild(title);
      item.appendChild(stats);

      if (typeof snap.last_error === "string" && snap.last_error !== "") {
        item.appendChild(
          createErrorDetailTrigger(snap.last_error, (PROVIDER_LABELS[key] || key) + " " + t("status.emotesSuffix"))
        );
      }

      dom.emoteProviderList.appendChild(item);
    });
  }

export function renderDiagnostics(payload) {
    if (!payload) {
      return;
    }
    rememberDiagnosticsPayload(payload);
    if (typeof payload.app_version === "string" && payload.app_version) {
      state.appVersion = payload.app_version;
      renderAboutVersion();
    }
    const uptimeText = formatUptime(payload.uptime_seconds);
    const clients = payload.websocket_clients;
    const wsText = typeof clients === "number" ? String(clients) : "-";
    const messageText = formatMessageCounts(payload.message_counts);

    if (dom.diagUptime) {
      dom.diagUptime.textContent = uptimeText;
    }
    if (dom.settingsDiagUptime) {
      dom.settingsDiagUptime.textContent = uptimeText;
    }
    if (dom.diagWsClients) {
      dom.diagWsClients.textContent = wsText;
    }
    if (dom.settingsDiagWsClients) {
      dom.settingsDiagWsClients.textContent = wsText;
    }
    if (dom.diagMessageCounts) {
      dom.diagMessageCounts.textContent = messageText;
    }
    if (dom.settingsDiagMessageCounts) {
      dom.settingsDiagMessageCounts.textContent = messageText;
    }
    if (payload.connectors) {
      renderStatus(payload.connectors);
    }
    renderLiveDiagnostics(payload);
    renderEmoteDiagnostics(payload.emote_cache);
  }

export function handleOAuthQuery() {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get("oauth");
    const oauthError = params.get("oauth_error");

    if (oauth === "success") {
      showBanner("success", t("banner.youtubeConnected"));
    } else if (oauth === "pending") {
      showBanner("info", t("banner.youtubeSignIn"));
    } else if (oauthError) {
      const messages = {
        denied: t("banner.youtubeDenied"),
        not_configured: t("banner.youtubeNotConfigured"),
        exchange_failed: t("banner.youtubeExchangeFailed"),
        open_failed: t("banner.youtubeOpenFailed"),
      };
      showBanner("error", messages[oauthError] || t("banner.youtubeAuthFailed"));
    }

    if (oauth || oauthError) {
      params.delete("oauth");
      params.delete("oauth_error");
      const query = params.toString();
      const next = window.location.pathname + (query ? "?" + query : "");
      window.history.replaceState({}, "", next);
      window.location.hash = "#settings/platforms";
    }
  }
