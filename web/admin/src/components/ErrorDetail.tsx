import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { useLocale } from "../app/locale";

export function ErrorDetail({
  error,
  label,
}: {
  error: string;
  label: string;
}) {
  const { t } = useLocale();
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false),
    [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState<CSSProperties>({
    visibility: "hidden",
  });
  useLayoutEffect(() => {
    if (!open || !trigger.current || !panel.current) return;
    const anchor = trigger.current.getBoundingClientRect(),
      popup = panel.current.getBoundingClientRect();
    setPosition({
      left: Math.max(
        12,
        Math.min(anchor.right - popup.width, innerWidth - popup.width - 12),
      ),
      top:
        anchor.bottom + 7 + popup.height > innerHeight - 12
          ? Math.max(12, anchor.top - popup.height - 7)
          : anchor.bottom + 7,
    });
  }, [open, error]);
  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      setPinned(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const outside = (event: PointerEvent) => {
      if (
        event.target !== trigger.current &&
        !(event.target instanceof Node && panel.current?.contains(event.target))
      )
        close();
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="error-detail-trigger"
        aria-label={t("status.errorAria", { label })}
        aria-controls={id}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => {
          if (!pinned && document.activeElement !== trigger.current)
            setOpen(false);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setPinned(false);
        }}
        onClick={() => {
          setOpen(!pinned);
          setPinned(!pinned);
        }}
      >
        {t("status.error")}
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            id={id}
            role="tooltip"
            className="status-error-popover"
            style={position}
          >
            {t("status.lastError", { error })}
          </div>,
          document.body,
        )}
    </>
  );
}
