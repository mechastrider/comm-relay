import { Outlet, useLocation, useNavigate } from "react-router";
import { useLocale } from "../../app/locale";
import { Tabs } from "../../components/Tabs";
const sections = [
  "viewers",
  "archive",
  "history",
  "progression",
  "commands",
  "greetings",
  "awards",
] as const;
export function Audience() {
  const { t } = useLocale();
  const location = useLocation(),
    navigate = useNavigate();
  const selected =
    sections.find((section) => section === location.pathname.split("/")[2]) ??
    "viewers";
  return (
    <section
      id="workspace-audience"
      className="workspace workspace--active"
      data-workspace="audience"
      aria-labelledby="workspace-audience-heading"
    >
      <div className="audience-workspace">
        <header className="audience-toolbar audience-toolbar--primary">
          <h1
            id="workspace-audience-heading"
            className="workspace-heading"
            tabIndex={-1}
          >
            {t("workspace.audienceHeading")}
          </h1>
          <Tabs
            items={sections.map((id) => ({
              id,
              label: t("audience.tab" + id[0].toUpperCase() + id.slice(1)),
            }))}
            selected={selected}
            onSelect={(next) => {
              void navigate(
                "/audience" + (next === "viewers" ? "" : "/" + next),
              );
            }}
            label={t("audience.tabList")}
            idPrefix="audience"
            className="audience-tabs console-tabs"
          />
        </header>
        <div
          id={`audience-${selected}-panel`}
          className={
            "audience-panel " +
            (["commands", "awards", "greetings"].includes(selected)
              ? "audience-catalog-panel"
              : "audience-" + selected + "-panel")
          }
          role="tabpanel"
          aria-labelledby={`audience-${selected}-tab`}
        >
          <Outlet />
        </div>
      </div>
    </section>
  );
}
