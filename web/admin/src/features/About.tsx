import { Button } from "../components/Button";
import { useState } from "react";
import { useLocale } from "../app/locale";
import { post } from "../services/api";
export function About({ version }: { version: string }) {
  const { t } = useLocale();
  const [feedback, setFeedback] = useState("");
  async function openSupport(url: string) {
    try {
      await post("/api/support/open", { url });
      setFeedback("");
    } catch {
      setFeedback(t("banner.couldNotOpenLink"));
    }
  }
  async function copyVersion() {
    try {
      await navigator.clipboard.writeText("CommRelay " + version);
      setFeedback(t("about.versionCopied"));
    } catch {
      setFeedback(t("about.copyFailed"));
    }
  }
  return (
    <section
      id="workspace-about"
      className="workspace about-workspace"
      data-workspace="about"
      aria-labelledby="workspace-about-heading"
    >
      <header className="about-workspace__header">
        <h1
          id="workspace-about-heading"
          className="workspace-heading"
          tabIndex={-1}
          data-i18n="nav.about"
        >
          {t("nav.about")}
        </h1>
        <p
          className="about-workspace__lead field-hint"
          data-i18n="about.subtitle"
        >
          {t("about.subtitle")}
        </p>
      </header>
      <div className="about-workspace__body">
        <section
          className="panel about-panel"
          data-i18n-aria-label="about.aboutCommRelay"
          aria-label={t("about.aboutCommRelay")}
        >
          <div className="about-identity">
            <div className="about-product">{"CommRelay"}</div>
            <div
              id="about-version"
              className="about-version"
              aria-live="polite"
            >
              {t("about.version", { version })}
            </div>
            <p className="about-status" data-i18n="about.privacy">
              {t("about.privacy")}
            </p>
          </div>
          <section
            className="about-section"
            aria-labelledby="about-support-heading"
          >
            <h2
              className="about-section-title"
              id="about-support-heading"
              data-i18n="about.support"
            >
              {t("about.support")}
            </h2>
            <p className="about-section-body" data-i18n="about.supportBody">
              {t("about.supportBody")}
            </p>
            <div className="about-actions">
              <Button variant="primary"
                id="about-telegram"
                className="about-link-btn"
                type="button"
                onClick={() =>
                  void openSupport("https://t.me/mechastrider_apps/2")
                }
              >
                <span data-i18n="about.telegram">{t("about.telegram")}</span>
                <small data-i18n="about.telegramSmall">
                  {t("about.telegramSmall")}
                </small>
              </Button>
              <Button
                id="about-github"
                className="about-link-btn"
                type="button"
                onClick={() =>
                  void openSupport("https://github.com/mechastrider/comm-relay")
                }
              >
                <span data-i18n="about.github">{t("about.github")}</span>
                <small data-i18n="about.githubSmall">
                  {t("about.githubSmall")}
                </small>
              </Button>
            </div>
          </section>
          <p className="about-license" data-i18n="about.license">
            {t("about.license")}
          </p>
        </section>
        <div className="about-workspace__actions">
          <Button
            id="about-copy-version"
            type="button"
            data-i18n="about.copyVersion"
            onClick={() => void copyVersion()}
          >
            {t("about.copyVersion")}
          </Button>
          <span
            id="about-feedback"
            className="about-feedback"
            role="status"
            hidden={!feedback}
          >
            {feedback}
          </span>
        </div>
      </div>
    </section>
  );
}
