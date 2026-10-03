import { useEffect, useRef, useState } from "react";
import { useRuntime, useWire } from "./runtime";
import { useLocale } from "./locale";
import { Button } from "../components/Button";
import { createCommandAudio, type AudioStatus } from "../services/command-audio";

export function CommandAudio() {
  const { config } = useRuntime();
  const { t } = useLocale();
  const [status, setStatus] = useState<AudioStatus>("");
  const monitor = useRef<ReturnType<typeof createCommandAudio> | null>(null);
  useEffect(() => {
    const audio = createCommandAudio(setStatus);
    monitor.current = audio;
    const unlock = () => { void audio.unlock(); };
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    window.addEventListener("pagehide", audio.dispose);
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
      window.removeEventListener("pagehide", audio.dispose);
      audio.dispose();
      monitor.current = null;
    };
  }, []);
  useEffect(() => {
    monitor.current?.setEnabled(Boolean(config && config.admin.command_sound_enabled !== false));
  }, [config]);
  useWire((frame) => monitor.current?.receive(frame));
  if (!status) return null;
  return (
    <div className="banner" role="status">
      <span>{t(status === "blocked" ? "sound.commandBlocked" : "sound.commandFailed")}</span>{" "}
      {status === "blocked" && (
        <Button type="button" className="btn-small" onClick={() => void monitor.current?.unlock()}>
          {t("sound.enableAudio")}
        </Button>
      )}
    </div>
  );
}
