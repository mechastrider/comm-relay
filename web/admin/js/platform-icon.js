/**
 * Admin-safe platform icons (Twitch, YouTube, VK, unknown).
 * SVG path vocabulary matches web/overlay/overlay.js appendPlatformIcon.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * @param {string} platform
 * @returns {string}
 */
export function normalizePlatformId(platform) {
  return String(platform || "").trim().toLowerCase();
}

/**
 * @param {string} d
 * @returns {SVGPathElement}
 */
function createSVGPath(d) {
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "currentColor");
  return path;
}

/**
 * @param {Record<string, string>} attrs
 * @returns {SVGRectElement}
 */
function createSVGRect(attrs) {
  const rect = document.createElementNS(SVG_NS, "rect");
  Object.keys(attrs).forEach(function (key) {
    rect.setAttribute(key, attrs[key]);
  });
  rect.setAttribute("fill", "currentColor");
  return rect;
}

/**
 * @param {string} text
 * @returns {SVGTextElement}
 */
function createSVGText(text) {
  const textEl = document.createElementNS(SVG_NS, "text");
  textEl.setAttribute("x", "12");
  textEl.setAttribute("y", "15");
  textEl.setAttribute("text-anchor", "middle");
  textEl.setAttribute("font-size", "8");
  textEl.setAttribute("font-weight", "700");
  textEl.setAttribute("fill", "currentColor");
  textEl.textContent = text;
  return textEl;
}

/**
 * @param {string} platform
 * @returns {SVGSVGElement}
 */
export function createPlatformIconSVG(platform) {
  const name = normalizePlatformId(platform);
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("platform-icon__glyph");

  if (name === "youtube") {
    svg.appendChild(createSVGRect({ x: "3", y: "6", width: "18", height: "12", rx: "3" }));
    svg.appendChild(createSVGPath("M10 9.2v5.6L15 12z"));
  } else if (name === "twitch") {
    svg.appendChild(createSVGPath("M5 4h16v11.5L16.5 20H12l-3 3v-3H5z"));
    svg.appendChild(createSVGRect({ x: "10", y: "8", width: "2", height: "5", rx: "0.5" }));
    svg.appendChild(createSVGRect({ x: "15", y: "8", width: "2", height: "5", rx: "0.5" }));
  } else if (name === "vk") {
    svg.appendChild(createSVGPath("M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"));
    svg.appendChild(createSVGText("VK"));
  } else {
    svg.appendChild(createSVGPath("M4 5h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"));
    svg.appendChild(createSVGPath("M8 11h8v2H8z"));
  }

  return svg;
}

/**
 * @param {HTMLElement} container
 * @param {string} platform
 * @param {string} accessibleName
 */
export function appendPlatformIcon(container, platform, accessibleName) {
  const name = normalizePlatformId(platform);
  const label = String(accessibleName || name || "").trim() || name;

  container.classList.add("platform-icon", "has-tooltip");
  container.replaceChildren();
  container.appendChild(createPlatformIconSVG(platform));

  const tooltip = document.createElement("span");
  tooltip.className = "ui-tooltip platform-icon__tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.textContent = label;
  container.appendChild(tooltip);

  container.setAttribute("aria-label", label);
}

/**
 * @param {HTMLElement} container
 * @param {string[]} platforms
 * @param {(platform: string) => string} formatPlatformLabel
 * @param {string} emptyLabel
 */
export function renderPlatformIcons(container, platforms, formatPlatformLabel, emptyLabel) {
  container.replaceChildren();
  container.className = "audience-viewers-table__platform-icons";

  if (!platforms.length) {
    const empty = document.createElement("span");
    empty.className = "audience-viewers-table__platforms-empty";
    empty.textContent = emptyLabel;
    container.appendChild(empty);
    return;
  }

  platforms.forEach(function (platform) {
    const icon = document.createElement("span");
    icon.className = "platform-icon-wrap";
    const knownKey = "platform." + platform;
    const translated = formatPlatformLabel(platform);
    const accessibleName = translated === knownKey ? platform : translated;
    appendPlatformIcon(icon, platform, accessibleName);
    container.appendChild(icon);
  });
}
