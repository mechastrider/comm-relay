import { Fragment } from "react";
import { useLocale } from "../app/locale";
/** Catalog markup supports emphasis only; interpolated values never become HTML. */
export function TranslatedText({ name }: { name: string }) {
  const { t } = useLocale();
  return (
    <>
      {t(name)
        .split(/(<strong>.*?<\/strong>)/g)
        .map((part, index) =>
          part.startsWith("<strong>") ? (
            <strong key={index}>{part.slice(8, -9)}</strong>
          ) : (
            <Fragment key={index}>{part}</Fragment>
          ),
        )}
    </>
  );
}
