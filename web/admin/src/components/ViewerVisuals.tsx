import { useEffect, useRef } from "react";
import { useLocale } from "../app/locale";
import { createLevelBadge, createAmmoRow } from "../../../shared/viewer-visual-status.js";
import "../../../shared/viewer-visual-status.css";

export interface VisualStatus {
  level?: { title: string; emblem?: string };
  like: { remaining: number; capacity: number };
  buff: { remaining: number; capacity: number };
}

export function LevelBadge({ level }: { level?: { title: string; emblem?: string } }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { t } = useLocale();
  useEffect(() => {
    const badge = createLevelBadge(level, t);
    ref.current?.replaceChildren(...(badge ? [badge] : []));
  }, [level, t]);
  return <span ref={ref} className="viewer-level-host" />;
}

export function ViewerAmmo({ status }: { status?: VisualStatus }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { t } = useLocale();
  useEffect(() => {
    const row = createAmmoRow(status, true, t);
    ref.current?.replaceChildren(...(row ? [row] : []));
  }, [status, t]);
  return <span ref={ref} />;
}
