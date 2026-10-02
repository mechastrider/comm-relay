import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import en from "../../../shared/locales/en.js";
import ru from "../../../shared/locales/ru.js";

export type Locale = "ru-RU" | "en-GB";
type Variables = Record<string, string | number>;
export type Translate = (key: string, values?: Variables) => string;
const catalogs: Record<Locale, Record<string, string>> = {
  "ru-RU": ru,
  "en-GB": en,
};
const key = "commRelay.uiLocale";
export function readPreference(name: string, fallback: string): string {
  try {
    return localStorage.getItem(name) ?? fallback;
  } catch {
    return fallback;
  }
}
export function writePreference(name: string, value: string): void {
  try {
    localStorage.setItem(name, value);
  } catch {
    /* Unavailable storage must not block the UI. */
  }
}
function initialLocale(): Locale {
  return readPreference(key, "ru-RU") === "en-GB" ? "en-GB" : "ru-RU";
}
export function translate(
  locale: Locale,
  name: string,
  values: Variables = {},
): string {
  const text = catalogs[locale][name] ?? catalogs["en-GB"][name] ?? name;
  return text.replace(/\{(\w+)\}/g, (match, variable: string) =>
    Object.hasOwn(values, variable) ? String(values[variable]) : match,
  );
}
const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
} | null>(null);
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState(initialLocale);
  useEffect(() => {
    document.documentElement.lang = locale === "en-GB" ? "en" : "ru";
    writePreference(key, locale);
  }, [locale]);
  const t = useCallback<Translate>(
    (name, values) => translate(locale, name, values),
    [locale],
  );
  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}
export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("LocaleProvider is missing");
  return context;
}
