import { apiURL, readJSON } from "./api.js";
import { t } from "./i18n-ui.js";

export const OVERLAY_ASSET_MAX_BYTES = 512 * 1024;
export const OVERLAY_ALERT_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const OVERLAY_ALERT_SOUND_MAX_BYTES = 5 * 1024 * 1024;

const SERVER_ERROR_KEYS = {
  "file is too large or invalid": "obs.assetTooLarge",
  "file is too large": "obs.assetTooLarge",
  "file type is not allowed": "obs.assetTypeNotAllowed",
  "heic and avif are not supported; use png or jpeg": "obs.assetModernFormat",
  "image dimensions exceed the allowed limit": "catalog.assetImageDimensions",
  "audio duration must be between 1 and 15 seconds": "catalog.assetSoundDuration",
  "audio file is not valid": "catalog.assetSoundInvalid",
  "could not read file": "obs.assetReadFailed",
  "could not store file": "obs.assetStoreFailed",
  "file is required": "obs.assetRequired",
};

const KIND_LIMITS = {
  panel: { bytes: OVERLAY_ASSET_MAX_BYTES, maxKb: 512, errorKey: "obs.assetTooLarge" },
  alert_image: {
    bytes: OVERLAY_ALERT_IMAGE_MAX_BYTES,
    maxKb: 4096,
    errorKey: "catalog.assetImageTooLarge",
  },
  alert_sound: {
    bytes: OVERLAY_ALERT_SOUND_MAX_BYTES,
    maxKb: 5120,
    errorKey: "catalog.assetSoundTooLarge",
  },
};

export function resolveOverlayUploadKind(kindOrOptions) {
  if (kindOrOptions === undefined || kindOrOptions === null) {
    return "panel";
  }
  if (typeof kindOrOptions === "string") {
    return kindOrOptions;
  }
  if (typeof kindOrOptions === "object" && typeof kindOrOptions.kind === "string") {
    return kindOrOptions.kind;
  }
  throw new Error(t("obs.assetUploadFailed"));
}

export function mapOverlayAssetUploadError(serverMessage, kind = "panel") {
  if (!serverMessage) {
    return t("obs.assetUploadFailed");
  }
  const key = SERVER_ERROR_KEYS[String(serverMessage).toLowerCase()];
  if (key) {
    const limits = KIND_LIMITS[kind] || KIND_LIMITS.panel;
    return t(key, { max_kb: limits.maxKb });
  }
  return serverMessage;
}

export async function uploadOverlayAsset(file, kindOrOptions = "panel") {
  if (!file) {
    throw new Error(t("obs.assetRequired"));
  }
  const kind = resolveOverlayUploadKind(kindOrOptions);
  const limits = KIND_LIMITS[kind];
  if (!limits) {
    throw new Error(t("obs.assetUploadFailed"));
  }
  if (file.size > limits.bytes) {
    throw new Error(t(limits.errorKey, { max_kb: limits.maxKb }));
  }

  const body = new FormData();
  body.append("file", file);
  body.append("kind", kind);
  const response = await fetch(apiURL("/api/overlay/assets/upload"), {
    method: "POST",
    body: body,
  });
  const payload = await readJSON(response);
  if (!response.ok || !payload || !payload.filename) {
    throw new Error(mapOverlayAssetUploadError(payload && payload.error, kind));
  }
  return payload.filename;
}
