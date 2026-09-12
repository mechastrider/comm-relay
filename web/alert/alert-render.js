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

export function combinedAlertPortraitScale(presetScale, itemSizePct) {
  const preset = Number.isFinite(presetScale) && presetScale > 0 ? presetScale : 1;
  return preset * alertImageScaleFromSizePct(itemSizePct);
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
  };
  if (alert && alert.source === "progression") {
    const level = alert.level && typeof alert.level === "object" ? alert.level : null;
    const achievements = Array.isArray(alert.achievements) ? alert.achievements : [];
    const names = achievements
      .map(function (item) { return text(item && item.name); })
      .filter(Boolean)
      .slice(0, 3);
    return Object.assign(base, {
      kind: "progression",
      emblemKind: "award",
      identifier: "progression",
      emblemLabel: "progression",
      name,
      levelTitle: level ? text(level.title) : "",
      achievementNames: names,
      avatarURL: safeImageURL(alert.avatar_url),
    });
  }
  if (alert && alert.source === "contract") {
    return Object.assign(base, {
      kind: "contract",
      emblemKind: "award",
      identifier: text(alert.award_id),
      emblemLabel: text(alert.award_name),
      title: text(alert.contract_title) || text(alert.text) || "Contract",
      objective: text(alert.contract_objective),
      rewardName: text(alert.award_name) || "Award",
      name,
      points: Number.isFinite(points) && points > 0 ? "+" + String(points) : "",
    });
  }
  if (alert && alert.source === "award") {
    return Object.assign(base, {
      kind: "award",
      identifier: text(alert.award_id),
      emblemLabel: text(alert.award_name),
      awardName: text(alert.award_name) || "Award",
      name,
      points: Number.isFinite(points) && points > 0 ? "+" + String(points) : "",
      quote: text(alert.message_text),
    });
  }
  if (alert && alert.source === "greeting") {
    const greetingKind = alert.greeting_kind === "returning_viewer" ? "returning_viewer" : "new_viewer";
    return Object.assign(base, {
      kind: "greeting",
      emblemKind: "greeting",
      identifier: greetingKind,
      emblemLabel: greetingKind,
      name,
      text: typeof alert.text === "string" ? alert.text : "",
    });
  }
  return Object.assign(base, {
    kind: "command",
    identifier: text(alert && alert.trigger),
    emblemLabel: text(alert && alert.trigger),
    name,
    text: typeof (alert && alert.text) === "string" ? alert.text : "",
  });
}

function renderBuiltInGraphic(documentRef, model, createEmblem) {
  if (typeof createEmblem === "function") {
    return createEmblem(documentRef, {
      kind: model.emblemKind || model.kind,
      identifier: model.identifier,
      label: model.emblemLabel,
    });
  }
  const fallback = documentRef.createElement("div");
  fallback.className = "alert-emblem alert-emblem--" + (model.emblemKind || model.kind);
  fallback.setAttribute("aria-hidden", "true");
  return fallback;
}

export function renderAlertPortrait(documentRef, model, imageURL, createEmblem) {
  const builtInGraphic = function () {
    return renderBuiltInGraphic(documentRef, model, createEmblem);
  };
  if (imageURL) {
    const fit = normalizeAlertImageFit(model.imageFit);
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
          tile.replaceWith(builtInGraphic());
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
        image.replaceWith(builtInGraphic());
      },
      { once: true }
    );
    return image;
  }
  return builtInGraphic();
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
    model.imageSizePct
  );
  splash.style.setProperty("--alert-portrait-scale", String(portraitScale));
  if (model.imageAsset) {
    splash.classList.add("alert-splash--has-custom-image");
  } else {
    splash.classList.add("alert-splash--has-built-in-graphic");
  }
  if (typeof options.userAccent === "function") {
    splash.style.setProperty("--message-accent", options.userAccent(model.name));
  }

  const portraitURL =
    model.imageAsset && typeof options.overlayAssetURL === "function"
      ? options.overlayAssetURL(model.imageAsset)
      : model.avatarURL;
  splash.append(
    renderAlertPortrait(documentRef, model, portraitURL, options.createEmblem)
  );
  const accent = documentRef.createElement("span");
  accent.className = "alert-accent";
  accent.setAttribute("aria-hidden", "true");
  splash.append(accent);

  const content = documentRef.createElement("div");
  content.className = "alert-content";
  if (model.kind === "progression") {
    appendTextElement(documentRef, content, "p", "alert-progression-name", model.name);
    if (model.levelTitle) {
      appendTextElement(documentRef, content, "p", "alert-progression-level", model.levelTitle);
    }
    if (model.achievementNames.length > 0) {
      appendTextElement(documentRef, content, "p", "alert-progression-achievements", model.achievementNames.join(" · "));
    }
  } else if (model.kind === "award") {
    appendTextElement(documentRef, content, "p", "alert-award-name", model.awardName);
    const viewer = appendTextElement(documentRef, content, "p", "alert-award-viewer", model.name);
    if (model.points) {
      appendTextElement(documentRef, viewer, "span", "alert-points", model.points);
    }
    if (model.quote) {
      appendTextElement(documentRef, content, "blockquote", "alert-quote", model.quote);
    }
  } else if (model.kind === "contract") {
    appendTextElement(documentRef, content, "p", "alert-contract-title", model.title);
    if (model.objective) {
      appendTextElement(documentRef, content, "p", "alert-contract-objective", model.objective);
    }
    const reward = appendTextElement(documentRef, content, "p", "alert-contract-reward", model.rewardName);
    if (model.points) {
      appendTextElement(documentRef, reward, "span", "alert-points", model.points);
    }
  } else {
    appendTextElement(documentRef, content, "p", "alert-text", model.text);
  }
  splash.append(content);
  return splash;
}
