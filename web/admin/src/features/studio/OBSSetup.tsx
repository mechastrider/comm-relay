import { useState } from "react";
import { useLocale } from "../../app/locale";
import { Modal } from "../../components/Dialog";
import { OBSSetupView } from "./OBSSetupView";
import { paths, type Preset } from "./model";
import { copyText } from "./preferences";
const labels: Record<string, [string, string]> = {
  chat: ["obs.onStreamOverlay", "obs.overlaySummary"],
  leaderboard: ["obs.leaderboard", "obs.leaderboardSummary"],
  alerts: ["obs.alerts", "obs.alertsSummary"],
  recap: ["obs.recap", "obs.recapSummary"],
  dock: ["obs.messageDock", "obs.dockSummary"],
};
export function OBSSetup({
  preset,
  period,
  setPeriod,
  onFinish,
}: {
  preset: Preset;
  period: string;
  setPeriod: (period: string) => void;
  onFinish: (outcome: string) => void;
}) {
  const { t } = useLocale();
  const [source, setSource] = useState("chat"),
    [status, setStatus] = useState("");
  const urls: Record<string, string> = {};
  for (const [surface, path] of Object.entries(paths)) {
    const prefix =
      "studio-add-to-obs-" +
      (surface === "chat"
        ? ""
        : surface === "alerts"
          ? "alert-"
          : surface + "-");
    const follow = new URL(path, location.origin);
    if (surface === "leaderboard") follow.searchParams.set("period", period);
    urls[prefix + "follow-url"] = follow.href;
    const pinned = new URL(follow);
    pinned.searchParams.set("preset", preset.id);
    urls[prefix + "pinned-url"] = pinned.href;
    urls[
      surface === "chat" ? "studio-add-to-obs-overlay-open" : prefix + "open"
    ] = follow.href;
  }
  urls["studio-add-to-obs-dock-url"] = new URL(
    "/dock/messages",
    location.origin,
  ).href;
  urls["studio-add-to-obs-dock-open"] = urls["studio-add-to-obs-dock-url"];
  const [title, summary] = labels[source];
  return (
    <Modal
      id="studio-add-to-obs-dialog"
      className="settings-dialog studio-add-to-obs-dialog"
      open
      onClose={() => onFinish("seen")}
      labelledBy="studio-add-to-obs-heading"
    >
      <OBSSetupView
        source={source}
        choose={(next) => {
          setSource(next);
          setStatus("");
        }}
        finish={onFinish}
        copy={(id) => {
          const input = document.getElementById(id) as HTMLInputElement | null;
          void copyText(urls[id], input).then((ok) =>
            setStatus(t(ok ? "obs.copyCopied" : "obs.copyManual")),
          );
        }}
        urls={urls}
        period={period}
        setPeriod={setPeriod}
        presetName={preset.name}
        title={title}
        summary={summary}
        status={status}
      />
    </Modal>
  );
}
