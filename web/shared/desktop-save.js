/**
 * Native save dialog when running inside the Wails desktop shell.
 * Falls back to anchor download in the browser.
 */

function desktopSaveAPI() {
  const go = window.go;
  if (!go || !go.main || !go.main.DesktopAPI) {
    return null;
  }
  const api = go.main.DesktopAPI;
  if (typeof api.SavePNGFile !== "function") {
    return null;
  }
  return api;
}

// A MessageChannel keeps responses private to the requesting admin document.
// The shell validates both the exact origin and the source frame before replying.
function framedDesktopSaveAPI() {
  if (window.parent === window || typeof MessageChannel !== "function") return Promise.resolve(null);
  return new Promise(function (resolve) {
    const channel = new MessageChannel();
    const port = channel.port1;
    const timer = setTimeout(function () { port.close(); resolve(null); }, 500);
    port.onmessage = function (event) {
      clearTimeout(timer);
      if (!event.data?.available) { port.close(); resolve(null); return; }
      resolve({ SavePNGFile: function (...args) {
        return new Promise(function (saved, reject) {
          port.onmessage = function (response) {
            port.close();
            if (response.data?.error) reject(new Error(response.data.error));
            else saved(response.data?.path || "");
          };
          port.postMessage({ args });
        });
      } });
    };
    // Wails v2 uses these built-in origins. Never hand the PNG channel to an
    // arbitrary website that happens to embed the loopback admin.
    const shellOrigin = /Windows/.test(navigator.userAgent) ? "http://wails.localhost" : "wails://wails";
    window.parent.postMessage({ type: "comm-relay:desktop-save" }, shellOrigin, [channel.port2]);
  });
}

function blobToBase64(blob) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () {
      const dataUrl = String(reader.result || "");
      const comma = dataUrl.indexOf(",");
      if (comma < 0) {
        reject(new Error("data url"));
        return;
      }
      resolve(dataUrl.slice(comma + 1));
    };
    reader.onerror = function () {
      reject(reader.error || new Error("read blob"));
    };
    reader.readAsDataURL(blob);
  });
}

function triggerAnchorDownload(blob, filename) {
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

/**
 * @param {Blob} blob
 * @param {string} filename
 * @param {string} [dialogTitle]
 * @returns {Promise<{ cancelled: boolean, path?: string, browser?: boolean }>}
 */
export async function saveBlobWithDialog(blob, filename, dialogTitle) {
  const api = desktopSaveAPI() || await framedDesktopSaveAPI();
  if (api) {
    const pngBase64 = await blobToBase64(blob);
    const path = await api.SavePNGFile(dialogTitle || "", filename, pngBase64);
    if (!path) {
      return { cancelled: true };
    }
    return { cancelled: false, path: String(path) };
  }

  triggerAnchorDownload(blob, filename);
  return { cancelled: false, browser: true };
}

export function hasDesktopSaveDialog() {
  return desktopSaveAPI() !== null;
}
