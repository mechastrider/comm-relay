import { RECAP_WINDOW_ALL, RECAP_WINDOW_SESSION } from "/overlay/recap/recap-model.js?v=2";
import { renderRecap } from "/overlay/recap/recap-render.js?v=3";
import { readCachedLocale, setLocale } from "/shared/i18n.js?v=18";

const SHARE_WIDTH = 1920;
const SHARE_HEIGHT = 1080;
const SVG_NS = "http://www.w3.org/2000/svg";
const XHTML_NS = "http://www.w3.org/1999/xhtml";
const OPAQUE_BACKDROP = "rgb(12, 18, 26)";

let recapStylesPromise = null;

function loadRecapStyles() {
  if (!recapStylesPromise) {
    recapStylesPromise = Promise.all([
      fetch("/overlay/overlay.css?v=24").then(function (response) { return response.ok ? response.text() : ""; }),
      fetch("/overlay/recap/recap.css?v=3").then(function (response) { return response.ok ? response.text() : ""; }),
    ]).then(function (parts) {
      return parts.join("\n")
        .replace(/@import[^;]+;/g, "")
        .replace(/html\s*,\s*body\s*\{[^}]*\}/g, "");
    });
  }
  return recapStylesPromise;
}

function waitForImages(root) {
  const images = Array.from(root.querySelectorAll("img"));
  if (!images.length) {
    return Promise.resolve();
  }
  return Promise.all(images.map(function (image) {
    if (image.complete && image.naturalWidth > 0) {
      return Promise.resolve();
    }
    return new Promise(function (resolve) {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  }));
}

function inlineHostImages(root) {
  Array.from(root.querySelectorAll("img")).forEach(function (image) {
    if (!image.naturalWidth) {
      image.remove();
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      image.src = canvas.toDataURL("image/png");
    } catch {
      image.remove();
    }
  });
}

/**
 * @param {object} snapshot normalized recap snapshot
 * @param {string} window session | all
 * @param {string} cssText embedded stylesheet rules
 */
export function buildRecapShareCardElement(snapshot, window, cssText) {
  setLocale(readCachedLocale());
  const host = document.createElement("div");
  host.className = "recap-share-card-host";
  host.setAttribute("xmlns", XHTML_NS);
  host.style.width = SHARE_WIDTH + "px";
  host.style.height = SHARE_HEIGHT + "px";
  host.style.background = OPAQUE_BACKDROP;
  host.style.boxSizing = "border-box";
  host.style.overflow = "hidden";
  host.style.position = "relative";

  const style = document.createElement("style");
  style.textContent = cssText +
    "\n.recap-share-card-host #recap-root{position:relative;inset:auto;width:100%;height:100%;min-height:100%;}" +
    "\n.recap-share-card-host .recap{position:absolute;inset:0;background-color:rgb(8,14,22);animation:none!important;opacity:1!important;transform:none!important;}" +
    "\n.recap-share-card-host .recap *{animation:none!important;}\n";
  host.appendChild(style);

  const root = document.createElement("div");
  root.id = "recap-root";
  host.appendChild(root);
  renderRecap(root, snapshot, window === RECAP_WINDOW_ALL ? RECAP_WINDOW_ALL : RECAP_WINDOW_SESSION);
  return host;
}

async function rasterizeHost(host) {
  const canvas = document.createElement("canvas");
  canvas.width = SHARE_WIDTH;
  canvas.height = SHARE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas");
  }
  ctx.fillStyle = OPAQUE_BACKDROP;
  ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT);

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", XHTML_NS);
  wrapper.style.width = SHARE_WIDTH + "px";
  wrapper.style.height = SHARE_HEIGHT + "px";
  wrapper.style.background = OPAQUE_BACKDROP;
  wrapper.appendChild(host.cloneNode(true));

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", String(SHARE_WIDTH));
  svg.setAttribute("height", String(SHARE_HEIGHT));
  const foreign = document.createElementNS(SVG_NS, "foreignObject");
  foreign.setAttribute("width", "100%");
  foreign.setAttribute("height", "100%");
  foreign.appendChild(wrapper);
  svg.appendChild(foreign);

  svg.setAttribute("xmlns", SVG_NS);
  const svgMarkup = new XMLSerializer().serializeToString(svg);
  // Chromium taints canvas when an SVG blob URL contains foreignObject; a data URL does not.
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgMarkup);
  const image = new Image();
  image.decoding = "async";
  await new Promise(function (resolve, reject) {
    image.onload = resolve;
    image.onerror = function () { reject(new Error("share-card image")); };
    image.src = url;
  });
  ctx.drawImage(image, 0, 0, SHARE_WIDTH, SHARE_HEIGHT);
  return canvas;
}

/**
 * @param {{ snapshot: object, window: string }} input
 * @returns {Promise<Blob>}
 */
export async function encodeRecapSharePNG(input) {
  const snapshot = input && input.snapshot;
  const window = input && input.window === RECAP_WINDOW_ALL ? RECAP_WINDOW_ALL : RECAP_WINDOW_SESSION;
  if (!snapshot) {
    throw new Error("missing snapshot");
  }
  const cssText = await loadRecapStyles();
  const host = buildRecapShareCardElement(snapshot, window, cssText);
  await waitForImages(host);
  inlineHostImages(host);
  const canvas = await rasterizeHost(host);
  return new Promise(function (resolve, reject) {
    canvas.toBlob(function (result) {
      if (result) resolve(result);
      else reject(new Error("encode"));
    }, "image/png");
  });
}

export function triggerRecapDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(function () { URL.revokeObjectURL(url); }, 0);
}
