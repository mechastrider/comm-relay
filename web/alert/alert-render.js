function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

const STORED_IMAGE_ASSET_RE = /^[a-z0-9][a-z0-9._-]{0,127}\.(png|jpe?g|webp)$/i;
const STORED_SOUND_ASSET_RE = /^[a-z0-9][a-z0-9._-]{0,127}\.(mp3|wav)$/i;

function safeStoredFilename(value, pattern) {
  const candidate = text(value);
  if (!candidate) {
    return "";
  }
  if (candidate.includes("..") || candidate.includes("://") || /[\\/]/.test(candidate)) {
    return "";
  }
  return pattern.test(candidate) ? candidate : "";
}

export function safeStoredImageAssetFilename(value) {
  return safeStoredFilename(value, STORED_IMAGE_ASSET_RE);
}

export function safeStoredSoundAssetFilename(value) {
  return safeStoredFilename(value, STORED_SOUND_ASSET_RE);
}

/** @deprecated Use safeStoredImageAssetFilename for alert images. */
export function safeStoredAssetFilename(value) {
  return safeStoredImageAssetFilename(value);
}

export function safeImageURL(value) {
  const candidate = text(value);
  return candidate.startsWith("http://") || candidate.startsWith("https://") ? candidate : "";
}

export function normalizeAlertLayout(layout) {
  const value = text(layout).toLowerCase();
  if (value === "card" || value === "banner" || value === "fullscreen") {
    return value;
  }
  return "fullscreen";
}

const ALERT_IMAGE_FITS = new Set(["cover", "contain", "fill", "tile"]);

export function normalizeAlertImageFit(fit) {
  const value = text(fit).toLowerCase();
  if (ALERT_IMAGE_FITS.has(value)) {
    return value;
  }
  return "contain";
}

export function normalizeAlertImageSizePct(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 100;
  }
  return Math.max(25, Math.min(300, Math.round(parsed)));
}

export function alertImageScaleFromSizePct(sizePct) {
  return normalizeAlertImageSizePct(sizePct) / 100;
}

export function combinedAlertPortraitScale(presetScale, itemSizePct, hasCustomImage) {
  const preset = Number.isFinite(presetScale) && presetScale > 0 ? presetScale : 1;
  const item = hasCustomImage ? alertImageScaleFromSizePct(itemSizePct) : 1;
  return preset * item;
}

export function alertImageFitObjectFit(fit) {
  const normalized = normalizeAlertImageFit(fit);
  if (normalized === "fill") {
    return "fill";
  }
  if (normalized === "tile") {
    return "none";
  }
  return normalized;
}

export function alertRenderModel(alert) {
  const name = text(alert && alert.name) || "Viewer";
  const points = Number(alert && alert.points);
  const imageAsset = safeStoredImageAssetFilename(alert && alert.image_asset);
  const base = {
    layout: normalizeAlertLayout(alert && alert.layout),
    imageFit: normalizeAlertImageFit(alert && alert.image_fit),
    imageSizePct: normalizeAlertImageSizePct(alert && alert.image_size_pct),
    imageAsset,
    avatarURL: safeImageURL(alert && alert.avatar_url),
  };
  if (alert && alert.source === "award") {
    return Object.assign(base, {
      kind: "award",
      awardName: text(alert.award_name) || "Award",
      name,
      points: Number.isFinite(points) && points > 0 ? "+" + String(points) : "",
      quote: text(alert.message_text),
    });
  }
  return Object.assign(base, {
    kind: "command",
    name,
    text: typeof (alert && alert.text) === "string" ? alert.text : "",
  });
}

const SVG_NS = "http://www.w3.org/2000/svg";

function createAlertAvatarPlaceholderIcon(documentRef) {
  const createSVG =
    typeof documentRef.createElementNS === "function"
      ? function (tagName) {
          return documentRef.createElementNS(SVG_NS, tagName);
        }
      : function (tagName) {
          return documentRef.createElement(tagName);
        };

  const svg = createSVG("svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "alert-avatar__placeholder-icon");
  svg.setAttribute("fill", "currentColor");

  const head = createSVG("circle");
  head.setAttribute("cx", "12");
  head.setAttribute("cy", "9");
  head.setAttribute("r", "4");
  head.setAttribute("opacity", "0.92");

  const shoulders = createSVG("path");
  shoulders.setAttribute("d", "M5 20.5c.8-3.4 3.5-5.5 7-5.5s6.2 2.1 7 5.5");
  shoulders.setAttribute("opacity", "0.92");

  svg.append(head, shoulders);
  return svg;
}

export function renderAvatar(documentRef, name, avatarURL) {
  if (avatarURL) {
    const avatar = documentRef.createElement("img");
    avatar.className = "alert-avatar";
    avatar.src = avatarURL;
    avatar.alt = "";
    avatar.loading = "eager";
    avatar.referrerPolicy = "no-referrer";
    avatar.addEventListener(
      "error",
      function () {
        avatar.replaceWith(renderAvatar(documentRef, name, ""));
      },
      { once: true }
    );
    return avatar;
  }

  const placeholder = documentRef.createElement("div");
  placeholder.className = "alert-avatar alert-avatar--placeholder";
  placeholder.setAttribute("aria-hidden", "true");
  placeholder.append(createAlertAvatarPlaceholderIcon(documentRef));
  return placeholder;
}

export function renderAlertPortrait(documentRef, name, imageURL, avatarURL, imageFit) {
  if (imageURL) {
    const fit = normalizeAlertImageFit(imageFit);
    if (fit === "tile") {
      const tile = documentRef.createElement("div");
      tile.className = "alert-avatar alert-avatar--custom alert-image-fit--tile";
      tile.style.backgroundImage = 'url("' + imageURL + '")';

      const probe = documentRef.createElement("img");
      probe.className = "alert-avatar__tile-probe";
      probe.src = imageURL;
      probe.alt = "";
      probe.addEventListener(
        "error",
        function () {
          tile.replaceWith(renderAvatar(documentRef, name, avatarURL));
        },
        { once: true }
      );
      tile.append(probe);
      return tile;
    }
    const image = documentRef.createElement("img");
    image.className = "alert-avatar alert-avatar--custom alert-image-fit--" + fit;
    image.style.objectFit = alertImageFitObjectFit(fit);
    image.src = imageURL;
    image.alt = "";
    image.loading = "eager";
    image.addEventListener(
      "error",
      function () {
        image.replaceWith(renderAvatar(documentRef, name, avatarURL));
      },
      { once: true }
    );
    return image;
  }
  return renderAvatar(documentRef, name, avatarURL);
}

function appendTextElement(documentRef, parent, tagName, className, value) {
  const element = documentRef.createElement(tagName);
  element.className = className;
  element.textContent = value;
  parent.append(element);
  return element;
}

/** Builds all untrusted alert copy through textContent, never HTML parsing. */
export function createAlertSplash(documentRef, alert, options = {}) {
  const model = alertRenderModel(alert);
  const splash = documentRef.createElement("article");
  splash.className =
    "alert-splash alert-splash--" + model.kind + " alert-splash--layout-" + model.layout;
  if (options.reducedMotion) {
    splash.classList.add("alert-splash--reduced");
  }
  const portraitScale = combinedAlertPortraitScale(
    options.presetImageScale,
    model.imageSizePct,
    Boolean(model.imageAsset)
  );
  splash.style.setProperty("--alert-portrait-scale", String(portraitScale));
  if (model.imageAsset) {
    splash.classList.add("alert-splash--has-custom-image");
  }
  if (typeof options.userAccent === "function") {
    splash.style.setProperty("--message-accent", options.userAccent(model.name));
  }

  const portraitURL =
    model.imageAsset && typeof options.overlayAssetURL === "function"
      ? options.overlayAssetURL(model.imageAsset)
      : "";
  splash.append(
    renderAlertPortrait(documentRef, model.name, portraitURL, model.avatarURL, model.imageFit)
  );
  const accent = documentRef.createElement("span");
  accent.className = "alert-accent";
  accent.setAttribute("aria-hidden", "true");
  splash.append(accent);

  const content = documentRef.createElement("div");
  content.className = "alert-content";
  if (model.kind === "award") {
    appendTextElement(documentRef, content, "p", "alert-award-name", model.awardName);
    const viewer = appendTextElement(documentRef, content, "p", "alert-award-viewer", model.name);
    if (model.points) {
      appendTextElement(documentRef, viewer, "span", "alert-points", model.points);
    }
    if (model.quote) {
      appendTextElement(documentRef, content, "blockquote", "alert-quote", model.quote);
    }
  } else {
    appendTextElement(documentRef, content, "p", "alert-text", model.text);
  }
  splash.append(content);
  return splash;
}
