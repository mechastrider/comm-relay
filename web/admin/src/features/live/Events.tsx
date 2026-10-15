import { useRef, useState } from "react";
import { useLocale } from "../../app/locale";
import { Button } from "../../components/Button";
import { useLiveEvents, type EventCategory } from "./useLiveEvents";

const categories: EventCategory[] = ["all", "reactions", "commands", "progress"];
export function Events({ refreshVersion }: { refreshVersion: number }) {
  const [category, setCategory] = useState<EventCategory>("all");
  return <EventFeed key={category + refreshVersion} category={category} onCategory={setCategory} refreshVersion={refreshVersion} />;
}

function EventFeed({ category, onCategory, refreshVersion }: {
  category: EventCategory;
  onCategory: (value: EventCategory) => void;
  refreshVersion: number;
}) {
  const { t, locale } = useLocale();
  const feed = useLiveEvents(category, refreshVersion);
  const list = useRef<HTMLDivElement>(null);
  const resume = () => {
    feed.resume();
    if (list.current) list.current.scrollTop = 0;
  };
  return (
    <div className="live-events">
      <div className="live-events__toolbar">
        <label htmlFor="live-events-category">{t("events.filter")}</label>
        <select id="live-events-category" value={category} onChange={(event) => onCategory(event.target.value as EventCategory)}>
          {categories.map((value) => <option key={value} value={value}>{t("events.category." + value)}</option>)}
        </select>
        <Button type="button" onClick={feed.paused ? resume : feed.pause}>
          {t(feed.paused ? "events.resume" : "events.pause")}
        </Button>
        <span role="status">
          {feed.newCount > 0 && <Button type="button" onClick={resume}>{t("events.new", { count: feed.newCount === 50 ? "50+" : feed.newCount })}</Button>}
        </span>
      </div>
      <p className="field-hint">{t("events.scope")}</p>
      {feed.error && <div className="live-region-error" role="alert">
        <span>{t("events.error")}</span>{" "}
        <Button type="button" disabled={feed.busy} onClick={feed.retry}>{t("events.retry")}</Button>
      </div>}
      <div ref={list} className="live-events__body" tabIndex={0} role="region" aria-label={t("events.list")}
        onScroll={(event) => { if (event.currentTarget.scrollTop > 8 && !feed.paused) feed.pause(); }}>
        {feed.loading ? <p role="status">{t("events.loading")}</p> : !feed.page.entries.length && !feed.error ? <p className="empty-state">{t("events.empty")}</p> : null}
        <ol className="live-events__list">
          {feed.page.entries.map((entry) => <li key={entry.id} className="live-events__entry" data-event-kind={entry.kind}>
            <time dateTime={entry.created_at} title={new Date(entry.created_at).toLocaleString(locale)}>
              {new Date(entry.created_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </time>
            <div>
              <span className="live-events__kind">{t("events.kind." + entry.kind)}</span>
              <p>{t("events.row." + entry.kind, {
                viewer: entry.viewer_name || t("events.unknown"),
                recipient: entry.recipient_name || t("events.unknown"),
                label: entry.label,
              })}{["award", "like", "buff"].includes(entry.kind) && <span className="live-events__xp"> · +{entry.points} XP</span>}</p>
            </div>
          </li>)}
        </ol>
        {feed.page.next_cursor && <Button type="button" disabled={feed.busy} onClick={feed.older}>{t("events.older")}</Button>}
      </div>
      <details className="live-events__history-hint"><summary>{t("events.historyTitle")}</summary><p className="field-hint">{t("events.historyHint")}</p></details>
    </div>
  );
}
