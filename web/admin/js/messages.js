import { createChatRender, safeImageURL, appendText } from '/shared/chat-render.js?v=12';
import * as dom from './dom.js';
import { state } from './state.js';
import {
  RECENT_MESSAGE_LIMIT,
  MESSAGE_SCROLL_THRESHOLD_PX,
} from './constants.js';
import { apiURL } from './api.js';
import { showBanner } from './ui-shell.js';
import { getMessageSoundSettings, playMessageSound } from './sound.js';
import { t } from './i18n-ui.js';

export function getImagePreviewSettings() {
    const overlay = state.currentConfig && state.currentConfig.overlay;
    const previews = overlay && overlay.image_previews;
    if (!previews || typeof previews !== "object") {
      return {
        enabled: false,
        allowed_hosts: [],
        max_width_px: 320,
        max_height_px: 180,
      };
    }
    return previews;
  }

export function imagePreviewHostAllowed(hostname, allowedHosts) {
    const host = typeof hostname === "string" ? hostname.trim().toLowerCase() : "";
    if (host === "" || !Array.isArray(allowedHosts) || allowedHosts.length === 0) {
      return false;
    }
    return allowedHosts.some(function (allowed) {
      const normalized =
        typeof allowed === "string" ? allowed.trim().toLowerCase() : "";
      return normalized !== "" && (host === normalized || host.endsWith("." + normalized));
    });
  }

export function isPreviewImageURL(rawURL, allowedHosts) {
    if (typeof rawURL !== "string" || rawURL.trim() === "") {
      return false;
    }
    try {
      const url = new URL(rawURL, window.location.href);
      if (url.protocol !== "https:") {
        return false;
      }
      if (url.username !== "" || url.password !== "") {
        return false;
      }
      if (url.port !== "" && url.port !== "443") {
        return false;
      }
      const path = url.pathname.toLowerCase();
      if (!/\.(png|jpe?g|gif|webp|avif)$/.test(path)) {
        return false;
      }
      return imagePreviewHostAllowed(url.hostname, allowedHosts);
    } catch {
      return false;
    }
  }

  const chatRender = createChatRender({
    classes: {
      emote: "message-list__emote",
      imagePreview: "message-list__image-preview",
      avatar: "message-list__avatar",
    },
    lazyImagePreviews: true,
    imagePreviewEnabled: function () {
      return getImagePreviewSettings().enabled;
    },
    resolvePreviewURL: function (rawURL) {
      const url = safeImageURL(rawURL);
      if (url === "") {
        return "";
      }
      const previews = getImagePreviewSettings();
      return isPreviewImageURL(url, previews.allowed_hosts) ? url : "";
    },
    applyImagePreviewStyles: function (img) {
      const previews = getImagePreviewSettings();
      if (typeof previews.max_width_px === "number" && previews.max_width_px >= 32) {
        img.style.maxWidth = String(previews.max_width_px) + "px";
      }
      if (typeof previews.max_height_px === "number" && previews.max_height_px >= 32) {
        img.style.maxHeight = String(previews.max_height_px) + "px";
      }
    },
  });

  const {
    appendMessageContent,
    buildAvatarImage,
    messageDisplayName,
    userAccent,
  } = chatRender;

export function messageKey(msg) {
    const id = typeof msg.id === "string" ? msg.id.trim() : "";
    if (id !== "") {
      return [
        typeof msg.platform === "string" ? msg.platform : "",
        id,
      ].join("\0");
    }

    return [
      typeof msg.platform === "string" ? msg.platform : "",
      messageDisplayName(msg),
      typeof msg.message === "string" ? msg.message : "",
      typeof msg.timestamp === "string" ? msg.timestamp : "",
    ].join("\0");
  }

export function hasNewMessages(messages) {
    if (!messages || messages.length === 0) {
      return false;
    }
    return messages.some(function (msg) {
      return !state.knownMessageKeys.has(messageKey(msg));
    });
  }

export function trackMessages(messages) {
    if (!messages) {
      return;
    }
    messages.forEach(function (msg) {
      state.knownMessageKeys.add(messageKey(msg));
    });
  }

export function wireToAdminMessage(wire) {
    const user = typeof wire.user === "string" ? wire.user : "";
    const displayName =
      typeof wire.display_name === "string" && wire.display_name !== ""
        ? wire.display_name
        : user;

    return {
      id: typeof wire.id === "string" ? wire.id : "",
      platform: typeof wire.platform === "string" ? wire.platform : "",
      username: user,
      display_name: displayName,
      message: typeof wire.message === "string" ? wire.message : "",
      fragments: Array.isArray(wire.fragments) ? wire.fragments : [],
      avatar_url: typeof wire.avatar_url === "string" ? wire.avatar_url : "",
      timestamp: typeof wire.timestamp === "string" && wire.timestamp !== ""
        ? wire.timestamp
        : new Date().toISOString(),
    };
  }

export function maybePlayMessageSound(messages) {
    if (!state.soundReady || !getMessageSoundSettings().enabled || !hasNewMessages(messages)) {
      return;
    }
    playMessageSound();
  }

export function messagesPanel() {
    return dom.recentMessages ? dom.recentMessages.closest(".message-panel") : null;
  }

export function messagesFingerprint(messages) {
    if (!messages || messages.length === 0) {
      return "";
    }
    return messages
      .map(function (msg) {
        return messageKey(msg);
      })
      .join("\0");
  }

export function renderedMessagesFingerprintFromDOM() {
    if (!dom.recentMessages) {
      return "";
    }
    return Array.from(dom.recentMessages.children)
      .map(function (el) {
        return el.dataset.messageKey || "";
      })
      .join("\0");
  }

export function isMessagesPanelNearBottom(panel) {
    if (!panel) {
      return true;
    }
    const distance = panel.scrollHeight - panel.scrollTop - panel.clientHeight;
    return distance <= MESSAGE_SCROLL_THRESHOLD_PX;
  }

export function timeLocale() {
    return state.currentConfig && state.currentConfig.admin && state.currentConfig.admin.time_locale === "en-GB"
      ? "en-GB"
      : "ru-RU";
  }

export function formatMessageTime(value) {
    if (typeof value !== "string" || value === "") {
      return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return new Intl.DateTimeFormat(timeLocale(), {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).format(date);
  }

export function isSameMessage(message, platform, id) {
    return Boolean(
      message &&
        typeof message.id === "string" &&
        message.id === id &&
        typeof message.platform === "string" &&
        message.platform === platform
    );
  }

export function removeMessageFromAdmin(platform, id) {
    const removed = state.recentMessageCache.filter(function (message) {
      return isSameMessage(message, platform, id);
    });
    if (removed.length === 0) {
      return;
    }
    removed.forEach(function (message) {
      state.knownMessageKeys.delete(messageKey(message));
    });
    state.recentMessageCache = state.recentMessageCache.filter(function (message) {
      return !isSameMessage(message, platform, id);
    });
    renderRecentMessages(state.recentMessageCache, { force: true });
  }

export async function deleteMessage(message, button) {
    if (!message || typeof message.id !== "string" || message.id === "") {
      return;
    }
    button.disabled = true;
    try {
      const response = await fetch(apiURL("/api/messages/delete"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: message.platform, id: message.id }),
      });
      if (!response.ok && response.status !== 404) {
        throw new Error("delete failed");
      }
      removeMessageFromAdmin(message.platform, message.id);
    } catch {
      button.disabled = false;
      showBanner("error", t("msg.couldNotDelete"));
    }
  }

export function buildMessageListItem(msg) {
    const item = document.createElement("li");
    item.className = "message-list__item";
    item.dataset.messageKey = messageKey(msg);
    item.style.setProperty("--message-accent", userAccent(msg));

    const meta = document.createElement("div");
    meta.className = "message-list__meta";

    const user = document.createElement("span");
    user.className = "message-list__user";
    appendText(user, messageDisplayName(msg));

    const platform = document.createElement("span");
    platform.className = "message-list__platform";
    appendText(platform, typeof msg.platform === "string" ? msg.platform : "");

    const time = document.createElement("time");
    time.className = "message-list__time";
    if (typeof msg.timestamp === "string") {
      time.dateTime = msg.timestamp;
      appendText(time, formatMessageTime(msg.timestamp));
    }

    meta.appendChild(user);
    meta.appendChild(platform);
    meta.appendChild(time);

    if (typeof msg.id === "string" && msg.id !== "") {
      const deleteButton = document.createElement("button");
      deleteButton.className = "message-list__delete";
      deleteButton.type = "button";
      deleteButton.textContent = t("msg.delete");
      deleteButton.setAttribute("aria-label", t("msg.deleteAria", { user: messageDisplayName(msg) }));
      deleteButton.addEventListener("click", function () {
        deleteMessage(msg, deleteButton);
      });
      meta.appendChild(deleteButton);
    }

    const text = document.createElement("p");
    text.className = "message-list__text";
    appendMessageContent(text, msg);

    const content = document.createElement("div");
    content.className = "message-list__content";
    content.appendChild(meta);
    content.appendChild(text);

    item.appendChild(buildAvatarImage(msg));
    item.appendChild(content);
    return item;
  }

export function scrollMessagesToBottom() {
    const panel = messagesPanel();
    if (!panel) {
      return;
    }
    window.requestAnimationFrame(function () {
      panel.scrollTop = panel.scrollHeight;
    });
  }

export function restoreMessagesScroll(panel, prevScrollTop, prevScrollHeight) {
    if (!panel) {
      return;
    }
    window.requestAnimationFrame(function () {
      if (isMessagesPanelNearBottom(panel)) {
        panel.scrollTop = panel.scrollHeight;
        return;
      }
      const delta = panel.scrollHeight - prevScrollHeight;
      panel.scrollTop = Math.max(0, prevScrollTop + delta);
    });
  }

export function appendRecentMessage(msg) {
    const stickToBottom = isMessagesPanelNearBottom(messagesPanel());

    dom.recentMessagesEmpty.hidden = true;
    state.recentMessageCache.push(msg);
    if (state.recentMessageCache.length > RECENT_MESSAGE_LIMIT) {
      state.recentMessageCache = state.recentMessageCache.slice(-RECENT_MESSAGE_LIMIT);
    }
    dom.recentMessages.appendChild(buildMessageListItem(msg));
    while (dom.recentMessages.children.length > RECENT_MESSAGE_LIMIT) {
      dom.recentMessages.removeChild(dom.recentMessages.firstChild);
    }
    state.renderedMessagesFingerprint = renderedMessagesFingerprintFromDOM();

    if (stickToBottom) {
      scrollMessagesToBottom();
    }
  }

export function renderRecentMessages(messages, options) {
    const fingerprint = messagesFingerprint(messages);
    const force = options && options.force;
    if (!force && fingerprint === state.renderedMessagesFingerprint && dom.recentMessages.children.length > 0) {
      return;
    }
    state.recentMessageCache = Array.isArray(messages) ? messages.slice() : [];

    const panel = messagesPanel();
    const stickToBottom = isMessagesPanelNearBottom(panel);
    const prevScrollTop = panel ? panel.scrollTop : 0;
    const prevScrollHeight = panel ? panel.scrollHeight : 0;

    dom.recentMessages.textContent = "";

    if (!messages || messages.length === 0) {
      dom.recentMessagesEmpty.hidden = false;
      state.renderedMessagesFingerprint = "";
      return;
    }

    dom.recentMessagesEmpty.hidden = true;

    messages.forEach(function (msg) {
      dom.recentMessages.appendChild(buildMessageListItem(msg));
    });
    state.renderedMessagesFingerprint = fingerprint;

    if (stickToBottom) {
      scrollMessagesToBottom();
    } else {
      restoreMessagesScroll(panel, prevScrollTop, prevScrollHeight);
    }
  }

export function handleWireMessage(wire) {
    if (!wire || typeof wire !== "object") {
      return;
    }
    if (wire.type === "message_deleted") {
      removeMessageFromAdmin(wire.platform, wire.id);
      return;
    }
    if (wire.type !== "message") {
      return;
    }

    const msg = wireToAdminMessage(wire);
    const key = messageKey(msg);
    if (state.knownMessageKeys.has(key)) {
      return;
    }
    state.knownMessageKeys.add(key);
    appendRecentMessage(msg);

    if (state.soundReady && getMessageSoundSettings().enabled) {
      playMessageSound();
    }
  }
