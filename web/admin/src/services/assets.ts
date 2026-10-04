import { ApiError, upload, request } from "./api";
import type { Translate } from "../app/locale";
export type AssetKind = "panel" | "alert_image" | "alert_sound";
const limits = {
  panel: [512, "obs.assetTooLarge"],
  alert_image: [4096, "catalog.assetImageTooLarge"],
  alert_sound: [5120, "catalog.assetSoundTooLarge"],
} as const;
const errors: Record<string, string> = {
  "file is too large or invalid": "obs.assetTooLarge",
  "file is too large": "obs.assetTooLarge",
  "heic and avif are not supported; use png or jpeg": "obs.assetModernFormat",
  "image dimensions exceed the allowed limit": "catalog.assetImageDimensions",
  "audio duration must be between 1 and 15 seconds":
    "catalog.assetSoundDuration",
  "audio file is not valid": "catalog.assetSoundInvalid",
  "could not read file": "obs.assetReadFailed",
  "could not store file": "obs.assetStoreFailed",
  "file is required": "obs.assetRequired",
};
export async function uploadAsset(
  file: File,
  kind: AssetKind,
  t: Translate,
): Promise<string> {
  const [maxKb, key] = limits[kind];
  if (file.size > maxKb * 1024) throw new Error(t(key, { max_kb: maxKb }));
  const data = new FormData();
  data.append("file", file);
  data.append("kind", kind);
  try {
    const result = await upload<{ filename: string }>(
      "/api/overlay/assets/upload",
      data,
    );
    if (!result?.filename) throw new Error(t("obs.assetUploadFailed"));
    return result.filename;
  } catch (cause) {
    if (!(cause instanceof ApiError)) throw cause;
    const message = cause.message.toLowerCase();
    const key =
      message === "file type is not allowed"
        ? kind === "alert_image"
          ? "catalog.assetImageTypeNotAllowed"
          : kind === "alert_sound"
            ? "catalog.assetSoundTypeNotAllowed"
            : "obs.assetTypeNotAllowed"
        : errors[message];
    throw new Error(key ? t(key, { max_kb: maxKb }) : cause.message, { cause });
  }
}
export function deleteAsset(filename: string) {
  if (!filename) return Promise.resolve();
  return request("/api/overlay/assets/delete", {
    method: "POST",
    body: JSON.stringify({ filename }),
    keepalive: true,
  })
    .then(() => undefined)
    .catch(() => undefined);
}
