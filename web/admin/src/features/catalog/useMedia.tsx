import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useLocale } from "../../app/locale";
import { uploadAsset, deleteAsset } from "../../services/assets";
import {
  ensureAudioContext,
  playAlertTone,
} from "../../../../alert/alert-sound";
import { AlertEmblem } from "../../components/AlertEmblem";
import { catalogImageFitCSSValue, overlayAssetPreviewURL } from "./media-model";
import type { CatalogDraft, CatalogRecord } from "./types";
export function useMedia(
  record: CatalogRecord,
  draft: CatalogDraft,
  change: (key: keyof CatalogDraft, value: string | boolean) => void,
  setError: (key: string, message: string) => void,
) {
  const { t } = useLocale();
  const assets = useRef(new Set<string>());
  const persisted = useRef([record.image_asset || "", record.sound_file || ""]);
  const alive = useRef(false);
  const sequence = useRef({ image_asset: 0, sound_file: 0 });
  const [uploading, setUploading] = useState(0);
  const playSequence = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null),
    context = useRef<AudioContext | null>(null);
  const stop = () => {
    playSequence.current++;
    audio.current?.pause();
    audio.current = null;
    if (context.current) {
      void context.current.close();
      context.current = null;
    }
  };
  useEffect(() => {
    alive.current = true;
    const pending = assets.current;
    const cleanup = () => {
      for (const filename of pending) void deleteAsset(filename);
      pending.clear();
    };
    window.addEventListener("beforeunload", cleanup);
    return () => {
      alive.current = false;
      cleanup();
      stop();
      window.removeEventListener("beforeunload", cleanup);
    };
  }, []);
  const abandon = (filename: string) => {
    if (assets.current.delete(filename)) void deleteAsset(filename);
  };
  const upload = async (field: "image_asset" | "sound_file", file: File) => {
    const generation = ++sequence.current[field];
    setUploading((value) => value + 1);
    setError(field, "");
    try {
      const filename = await uploadAsset(
        file,
        field === "image_asset" ? "alert_image" : "alert_sound",
        t,
      );
      if (!alive.current || generation !== sequence.current[field]) {
        if (!persisted.current.includes(filename)) void deleteAsset(filename);
        return;
      }
      if (!persisted.current.includes(filename)) assets.current.add(filename);
      if (draft[field] !== filename) abandon(draft[field]);
      change(field, filename);
    } catch (cause) {
      if (alive.current && generation === sequence.current[field])
        setError(
          field,
          cause instanceof Error ? cause.message : t("obs.assetUploadFailed"),
        );
    } finally {
      if (alive.current) setUploading((value) => value - 1);
    }
  };
  const clear = (field: "image_asset" | "sound_file") => {
    sequence.current[field]++;
    abandon(draft[field]);
    change(field, "");
    setError(field, "");
    if (field === "sound_file") stop();
  };
  const commit = (saved: CatalogRecord) => {
    const next = [saved.image_asset || "", saved.sound_file || ""];
    next.forEach((filename) => assets.current.delete(filename));
    persisted.current
      .filter((filename) => !next.includes(filename))
      .forEach((filename) => void deleteAsset(filename));
    persisted.current = next;
  };
  const release = () => {
    persisted.current.forEach((filename) => void deleteAsset(filename));
    persisted.current = [];
  };
  const play = async () => {
    stop();
    const generation = playSequence.current;
    try {
      if (draft.sound_file) {
        const player = new Audio(overlayAssetPreviewURL(draft.sound_file));
        audio.current = player;
        player.volume =
          Math.max(0, Math.min(100, Number(draft.sound_volume))) / 100;
        await player.play();
      } else if (draft.sound) {
        const ctx = await ensureAudioContext(null);
        if (!alive.current || generation !== playSequence.current) {
          void ctx?.close();
          return;
        }
        context.current = ctx;
        playAlertTone(
          ctx,
          draft.sound,
          ctx.currentTime,
          Number(draft.sound_volume),
        );
      }
    } catch (cause) {
      if (alive.current && generation === playSequence.current)
        setError(
          "sound_file",
          cause instanceof Error ? cause.message : t("banner.soundUnavailable"),
        );
    }
  };
  return {
    uploading: uploading > 0,
    upload,
    clear,
    commit,
    release,
    play,
    stop,
  };
}
export function MediaImage({
  kind,
  draft,
  identifier,
}: {
  kind: "command" | "award" | "greeting";
  draft: CatalogDraft;
  identifier: string;
}) {
  const [failed, setFailed] = useState("");
  const url = overlayAssetPreviewURL(draft.image_asset);
  const size = Math.round((72 * Number(draft.image_size_pct || 100)) / 100);
  const style = { width: size, height: size };
  if (!url || failed === url)
    return (
      <AlertEmblem
        kind={kind}
        identifier={identifier}
        label={draft.name || draft.trigger}
        style={style}
      />
    );
  if (draft.image_fit === "tile")
    return (
      <div
        className="catalog-media-preview__image catalog-media-preview__image--tile"
        style={{ ...style, backgroundImage: `url("${url}")` }}
      >
        <img
          className="catalog-media-preview__tile-probe"
          src={url}
          alt=""
          onError={() => setFailed(url)}
        />
      </div>
    );
  return (
    <img
      className="catalog-media-preview__image"
      src={url}
      alt=""
      style={{
        ...style,
        objectFit: catalogImageFitCSSValue(
          draft.image_fit,
        ) as CSSProperties["objectFit"],
      }}
      onError={() => setFailed(url)}
    />
  );
}
