import type { RefObject } from "react";
import { useLocale } from "../../app/locale";
import {
  SPLASH_VARIABLES,
  SPLASH_VARIABLE_TOOLTIP_I18N,
} from "./template-model";
export function TemplateChips({
  input,
  value,
  onChange,
  points = true,
}: {
  input: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (value: string) => void;
  points?: boolean;
}) {
  const { t } = useLocale();
  return (
    <>
      {SPLASH_VARIABLES.filter((token) => points || token !== "{points}").map(
        (token) => (
          <button
            key={token}
            type="button"
            className="catalog-template-chip has-tooltip"
            aria-label={
              t("catalog.insertVariable", { variable: token }) +
              ". " +
              t(SPLASH_VARIABLE_TOOLTIP_I18N[token])
            }
            onClick={() => {
              const field = input.current;
              const start = field?.selectionStart ?? value.length;
              const end = field?.selectionEnd ?? value.length;
              onChange(value.slice(0, start) + token + value.slice(end));
              requestAnimationFrame(() => {
                field?.focus();
                field?.setSelectionRange(
                  start + token.length,
                  start + token.length,
                );
              });
            }}
          >
            {token}
            <span className="ui-tooltip" role="tooltip">
              {t(SPLASH_VARIABLE_TOOLTIP_I18N[token])}
            </span>
          </button>
        ),
      )}
    </>
  );
}
