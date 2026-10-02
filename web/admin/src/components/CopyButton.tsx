import { IconButton } from "./Button";
import { useLocale } from "../app/locale";
export function CopyButton({
  id,
  target,
  onCopy,
  className = "",
}: {
  id?: string;
  target: string;
  onCopy: () => void;
  className?: string;
}) {
  const { t } = useLocale();
  return (
    <IconButton
      id={id}
      type="button"
      className={"icon-btn has-tooltip icon-btn--copy " + className}
      aria-label={t("obs.copyUrl")}
      data-copy-obs-url={target}
      onClick={onCopy}
    >
      <svg
        className="icon-btn__icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      >
        <rect x="9" y="9" width="13" height="13" rx="1.5" />
        <path
          d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
          strokeLinecap="round"
        />
      </svg>
      <span className="ui-tooltip" role="tooltip">
        {t("obs.copyUrl")}
      </span>
    </IconButton>
  );
}
