import { apiURL, readJSON } from "./api.js";
import { t } from "./i18n-ui.js";

export const OVERLAY_ASSET_MAX_BYTES = 512 * 1024;

const SERVER_ERROR_KEYS = {
  "file is too large or invalid": "obs.assetTooLarge",
  "file is too large": "obs.assetTooLarge",
  "file type is not allowed": "obs.assetTypeNotAllowed",
  "heic and avif are not supported; use png or jpeg": "obs.assetModernFormat",
  "could not read file": "obs.assetReadFailed",
  "could not store file": "obs.assetStoreFailed",
  "file is required": "obs.assetRequired",
};

export function mapOverlayAssetUploadError(serverMessage) {
  if (!serverMessage) {
    return t("obs.assetUploadFailed");
  }
  const key = SERVER_ERROR_KEYS[String(serverMessage).toLowerCase()];
  if (key) {
    return t(key, { max_kb: 512 });
  }
  return serverMessage;
}

export async function uploadOverlayAsset(file) {
  if (!file) {
    throw new Error(t("obs.assetRequired"));
  }
  if (file.size > OVERLAY_ASSET_MAX_BYTES) {
    throw new Error(t("obs.assetTooLarge", { max_kb: 512 }));
  }

  const body = new FormData();
  body.append("file", file);
  const response = await fetch(apiURL("/api/overlay/assets/upload"), {
    method: "POST",
    body: body,
  });
  const payload = await readJSON(response);
  if (!response.ok || !payload || !payload.filename) {
    throw new Error(mapOverlayAssetUploadError(payload && payload.error));
  }
  return payload.filename;
}
