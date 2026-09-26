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
  const api = desktopSaveAPI();
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
