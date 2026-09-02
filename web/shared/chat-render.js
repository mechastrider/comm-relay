const ACCENT_PALETTE = [
  "#57d68d",
  "#5ec8ff",
  "#ffca55",
  "#ff8f70",
  "#c89cff",
  "#66e3d4",
  "#f06ea9",
  "#a5d65e",
  "#8ca8ff",
  "#f0a84f",
];

const DETAILED_AVATAR_BG_PALETTE = [
  "#1e2d24",
  "#1c2b36",
  "#33281a",
  "#332022",
  "#2b2340",
];

const DETAILED_AVATAR_SHAPES = [
  '<circle cx="18" cy="20" r="10" fill="ACCENT" opacity="0.95"/>',
  '<rect x="9" y="9" width="30" height="30" rx="12" fill="ACCENT" opacity="0.95"/>',
  '<path d="M24 6 43 18 36 41H12L5 18Z" fill="ACCENT" opacity="0.95"/>',
  '<circle cx="17" cy="18" r="9" fill="ACCENT" opacity="0.9"/><circle cx="31" cy="29" r="12" fill="ACCENT" opacity="0.72"/>',
  '<path d="M8 32c6-18 26-22 32-6 2 6-2 12-8 14H16c-6-1-10-3-8-8Z" fill="ACCENT" opacity="0.95"/>',
];

export function appendText(el, text) {
  el.appendChild(document.createTextNode(typeof text === "string" ? text : ""));
}

// The overlay creates this once with each message row. Keeping the feedback in
// a dedicated slot lets reward timers update only transient decoration instead
// of rebuilding rich message content (emotes, previews, and avatars).
export function createRewardSlot() {
  const rewardSlot = document.createElement("span");
  rewardSlot.className = "message__reward-slot";
  rewardSlot.setAttribute("aria-hidden", "true");
  const rewardEl = document.createElement("span");
  rewardEl.className = "message__reward";
  const awardName = document.createElement("span");
  awardName.className = "message__reward-name";
  const points = document.createElement("span");
  points.className = "message__reward-points";
  rewardEl.append(awardName, points);
  rewardSlot.appendChild(rewardEl);
  return rewardSlot;
}

export function setRewardSlot(rewardSlot, reward, label) {
  const rewardEl = rewardSlot.querySelector(".message__reward");
  const awardName = rewardSlot.querySelector(".message__reward-name");
  const points = rewardSlot.querySelector(".message__reward-points");
  if (!reward || !rewardEl || !awardName || !points) {
    rewardSlot.setAttribute("aria-hidden", "true");
    if (rewardEl) {
      rewardEl.removeAttribute("aria-label");
      rewardEl.removeAttribute("title");
    }
    if (awardName) {
      awardName.textContent = "";
    }
    if (points) {
      points.textContent = "";
    }
    return;
  }

  const accessibleLabel = typeof label === "string" ? label : "";
  rewardEl.setAttribute("aria-label", accessibleLabel);
  rewardEl.title = accessibleLabel;
  awardName.textContent = typeof reward.award_name === "string" ? reward.award_name.trim() : "";
  points.textContent = typeof reward.points === "number" && reward.points > 0 ? "+" + String(reward.points) : "";
  rewardSlot.removeAttribute("aria-hidden");
}

export function readFragmentText(fragment) {
  return typeof fragment.text === "string" ? fragment.text : "";
}

export function safeImageURL(rawURL) {
  if (typeof rawURL !== "string" || rawURL.trim() === "") {
    return "";
  }
  try {
    const url = new URL(rawURL, window.location.href);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "";
    }
    return url.href;
  } catch {
    return "";
  }
}

export function safeAvatarURL(value) {
  return safeImageURL(value);
}

export function replaceBrokenImageWithText(img, text) {
  img.addEventListener(
    "error",
    function () {
      img.replaceWith(document.createTextNode(text));
    },
    { once: true }
  );
}

export function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function escapeSVGText(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function initialsForName(name) {
  return name
    .split(/[\s._-]+/)
    .filter(function (part) {
      return part !== "";
    })
    .slice(0, 2)
    .map(function (part) {
      return part.charAt(0).toUpperCase();
    })
    .join("") || "?";
}

/**
 * @param {object} [options]
 * @param {object} [options.classes]
 * @param {string} [options.usernameField]
 * @param {"detailed"|"compact"} [options.avatarFallback]
 * @param {() => boolean} [options.imagePreviewEnabled]
 * @param {(rawURL: string) => string} [options.resolvePreviewURL]
 * @param {(img: HTMLImageElement) => void} [options.applyImagePreviewStyles]
 */
export function createChatRender(options) {
  const opts = options || {};
  const classes = {
    emote: "message-list__emote",
    imagePreview: "message-list__image-preview",
    avatar: "message-list__avatar",
    ...(opts.classes || {}),
  };
  const usernameField = opts.usernameField || "username";
  const avatarFallback = opts.avatarFallback || "detailed";
  const imagePreviewEnabled = opts.imagePreviewEnabled || function () {
    return false;
  };
  const resolvePreviewURL = opts.resolvePreviewURL || function () {
    return "";
  };
  const applyImagePreviewStyles = opts.applyImagePreviewStyles || function () {};
  const lazyImagePreviews = opts.lazyImagePreviews === true;

  function messageDisplayName(msg) {
    if (typeof msg.display_name === "string" && msg.display_name !== "") {
      return msg.display_name;
    }
    const username = msg[usernameField];
    if (typeof username === "string" && username !== "") {
      return username;
    }
    return "?";
  }

  function messageIdentity(msg) {
    const platform = typeof msg.platform === "string" ? msg.platform.trim().toLowerCase() : "";
    const username = typeof msg[usernameField] === "string"
      ? msg[usernameField].trim().toLowerCase()
      : "";
    const displayName = messageDisplayName(msg).trim().toLowerCase();
    return [platform, username || displayName || "?"].join(":");
  }

  function userAccent(msg) {
    const hash = hashString(messageIdentity(msg));
    return ACCENT_PALETTE[hash % ACCENT_PALETTE.length];
  }

  function detailedAvatarFallbackURL(msg) {
    const identity = messageIdentity(msg);
    const hash = hashString(identity);
    const accent = userAccent(msg);
    const initials = escapeSVGText(initialsForName(messageDisplayName(msg)));
    const variant = hash % 5;
    const bg = DETAILED_AVATAR_BG_PALETTE[hash % DETAILED_AVATAR_BG_PALETTE.length];
    const shapes = DETAILED_AVATAR_SHAPES.map(function (shape) {
      return shape.replace(/ACCENT/g, accent);
    });
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' +
      '<rect width="48" height="48" rx="12" fill="' + bg + '"/>' +
      '<circle cx="40" cy="8" r="12" fill="#ffffff" opacity="0.08"/>' +
      shapes[variant] +
      '<text x="24" y="31" text-anchor="middle" font-family="Consolas,monospace" font-size="14" font-weight="700" fill="#fff">' +
      initials +
      "</text></svg>";
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function compactAvatarFallbackURL(msg) {
    const hash = hashString(messageIdentity(msg));
    const accent = userAccent(msg);
    const initials = escapeSVGText(initialsForName(messageDisplayName(msg)));
    const backgrounds = ["#1e2d24", "#1c2b36", "#33281a", "#332022", "#2b2340"];
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' +
      '<rect width="48" height="48" rx="10" fill="' + backgrounds[hash % backgrounds.length] + '"/>' +
      '<circle cx="24" cy="24" r="17" fill="' + accent + '" opacity="0.82"/>' +
      '<text x="24" y="30" text-anchor="middle" font-family="Consolas,monospace" font-size="14" font-weight="700" fill="#fff">' +
      initials +
      "</text></svg>";
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function avatarFallbackURL(msg) {
    if (avatarFallback === "compact") {
      return compactAvatarFallbackURL(msg);
    }
    return detailedAvatarFallbackURL(msg);
  }

  function buildAvatarImage(msg) {
    const avatar = document.createElement("img");
    avatar.className = classes.avatar;
    avatar.alt = "";
    avatar.decoding = "async";
    avatar.draggable = false;
    avatar.referrerPolicy = "no-referrer";

    const fallback = avatarFallbackURL(msg);
    const url = safeAvatarURL(msg.avatar_url);
    avatar.src = url !== "" ? url : fallback;
    if (url !== "") {
      avatar.addEventListener("error", function () {
        avatar.src = fallback;
      }, { once: true });
    }
    return avatar;
  }

  function appendEmoteFragment(el, fragment) {
    const text = readFragmentText(fragment);
    const url = safeImageURL(fragment.url);
    if (url === "") {
      appendText(el, text);
      return;
    }

    const img = document.createElement("img");
    img.className = classes.emote;
    img.src = url;
    img.alt = text;
    img.title = text;
    img.decoding = "async";
    img.draggable = false;
    img.referrerPolicy = "no-referrer";
    replaceBrokenImageWithText(img, text);
    el.appendChild(img);
  }

  function appendImageLinkFragment(el, fragment) {
    const text = readFragmentText(fragment);
    if (!imagePreviewEnabled()) {
      appendText(el, text);
      return;
    }

    const url = resolvePreviewURL(fragment.url);
    if (url === "") {
      appendText(el, text);
      return;
    }

    const img = document.createElement("img");
    img.className = classes.imagePreview;
    img.src = url;
    img.alt = "chat image";
    img.title = text;
    img.decoding = "async";
    if (lazyImagePreviews) {
      img.loading = "lazy";
    }
    img.draggable = false;
    img.referrerPolicy = "no-referrer";
    applyImagePreviewStyles(img);
    replaceBrokenImageWithText(img, text);
    el.appendChild(img);
  }

  function appendFragment(el, fragment) {
    if (!fragment || typeof fragment !== "object") {
      return;
    }

    const type = typeof fragment.type === "string" ? fragment.type : "";
    if (type === "text") {
      appendText(el, readFragmentText(fragment));
      return;
    }
    if (type === "emote") {
      appendEmoteFragment(el, fragment);
      return;
    }
    if (type === "image_link") {
      appendImageLinkFragment(el, fragment);
      return;
    }

    appendText(el, readFragmentText(fragment));
  }

  function appendMessageContent(el, msg, fallbackText) {
    const fallback = typeof fallbackText === "string"
      ? fallbackText
      : (typeof msg.message === "string" ? msg.message : "");
    if (!Array.isArray(msg.fragments) || msg.fragments.length === 0) {
      appendText(el, fallback);
      return;
    }

    const before = el.childNodes.length;
    msg.fragments.forEach(function (fragment) {
      appendFragment(el, fragment);
    });
    if (el.childNodes.length === before) {
      appendText(el, fallback);
    }
  }

  return {
    messageDisplayName,
    messageIdentity,
    userAccent,
    avatarFallbackURL,
    buildAvatarImage,
    appendEmoteFragment,
    appendImageLinkFragment,
    appendFragment,
    appendMessageContent,
  };
}
