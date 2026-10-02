import { useEffect, useRef, useState } from "react";
import { useLocale } from "../../app/locale";
import { previewURL, type Preset, type Surface } from "./model";
import { PreviewView } from "./PreviewView";
import { readPreference, writePreference, copyText } from "./preferences";
const prefix = "commRelay.overlayPreview.";
export function Preview({
  preset,
  surface,
  follow,
  pinned,
  period,
}: {
  preset: Preset;
  surface: Surface;
  follow: string;
  pinned: string;
  period: string;
}) {
  const { t, locale } = useLocale();
  const [options, setOptions] = useState(() => ({
    mode: readPreference(prefix + "mode", "sample"),
    width: readPreference(prefix + "width", "640"),
    height: readPreference(prefix + "height", "360"),
    background: readPreference(prefix + "background", "scene"),
  }));
  const [overflow, setOverflow] = useState(false),
    [replay, setReplay] = useState(0),
    [copyStatus, setCopyStatus] = useState("");
  const [readyURL, setReadyURL] = useState(""),
    [failedURL, setFailedURL] = useState("");
  const width = Math.max(240, Math.min(3840, Number(options.width) || 640)),
    height = Math.max(180, Math.min(2160, Number(options.height) || 360));
  const size = `${width}x${height}`;
  const desired =
    previewURL(
      preset,
      surface,
      options.mode,
      options.background,
      locale,
      period,
    );
  const [url, setURL] = useState(desired);
  useEffect(() => {
    const timer = setTimeout(() => setURL(desired), 120);
    return () => clearTimeout(timer);
  }, [desired]);
  const identity = url + ":" + replay;
  useEffect(() => {
    const timer = setTimeout(() => setFailedURL(identity), 8000);
    return () => clearTimeout(timer);
  }, [identity]);
  const stage = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!stage.current) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setBounds({ width: rect.width, height: rect.height });
    });
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  const scale = Math.min(
    1,
    Math.max(0, bounds.width - 20) / width,
    Math.max(0, bounds.height - 20) / height,
  );
  const change = (id: string, value: string) => {
    const key = id.replace("overlay-preview-", "");
    if (key === "size") {
      if (value === "custom") return;
      const [width, height] = value.split("x");
      setOptions((current) => ({ ...current, width, height }));
      writePreference(prefix + "width", width);
      writePreference(prefix + "height", height);
    } else {
      setOptions((current) => ({ ...current, [key]: value }));
      writePreference(prefix + key, value);
    }
  };
  const values = {
    ...Object.fromEntries(
      Object.entries(options).map(([key, value]) => [
        "overlay-preview-" + key,
        value,
      ]),
    ),
    "overlay-preview-size": [
      "640x360",
      "800x600",
      "1280x720",
      "480x720",
    ].includes(size)
      ? size
      : "custom",
    "studio-follow-url": follow,
    "studio-follow-url-compact": follow,
    "studio-pinned-url": pinned,
  };
  useEffect(() => {
    if (!overflow) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOverflow(false);
        document.getElementById("overlay-preview-overflow-toggle")?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [overflow]);
  return (
    <PreviewView
      values={values}
      change={change}
      surface={surface}
      overflow={overflow}
      action={(id) => {
        if (id === "overlay-preview-overflow-toggle")
          setOverflow((value) => !value);
        else setReplay((value) => value + 1);
      }}
      url={url}
      frameKey={identity}
      loaded={() => setReadyURL(identity)}
      stageRef={stage}
      viewportStyle={{
        width,
        height,
        transform: `translate(-50%, -50%) scale(${scale})`,
      }}
      state={
        readyURL === identity
          ? "ready"
          : failedURL === identity
            ? "error"
            : "loading"
      }
      copyStatus={copyStatus}
      copy={(id) => {
        const input = document.getElementById(id) as HTMLInputElement | null;
        void copyText(input?.value ?? follow, input).then((ok) =>
          setCopyStatus(t(ok ? "obs.copyCopied" : "obs.copyFailed")),
        );
      }}
    />
  );
}
