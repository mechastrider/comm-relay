import { useState } from "react";
import { useLocale } from "../../app/locale";
import { safeImageURL } from "../../../../shared/chat-render";
import type {
  RecapPresentation,
  RecapTotals,
  SessionDetail,
  SessionSummary,
} from "./recap-types";
export function useRecapTime() {
  const { t, locale } = useLocale();
  return (value?: string) =>
    !value || Number.isNaN(Date.parse(value))
      ? t("recap.unknownTime")
      : new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
          hourCycle: "h23",
        }).format(new Date(value));
}
function Portrait({ url, name }: { url?: string; name: string }) {
  const [failed, setFailed] = useState("");
  const safe = safeImageURL(url);
  return (
    <span className="live-recap-portrait">
      {safe && failed !== safe ? (
        <img
          src={safe}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(safe)}
        />
      ) : (
        (name || "?").trim().slice(0, 1).toUpperCase() || "?"
      )}
    </span>
  );
}
export function RecapTotalsView({ totals }: { totals: RecapTotals }) {
  const { t } = useLocale();
  return (
    <dl className="live-recap-totals">
      {[
        ["recap.totalViewers", totals.viewer_count],
        ["recap.totalMessages", totals.message_count],
        ["recap.totalXP", totals.xp],
      ].map(([key, value]) => (
        <div className="live-recap-totals__item" key={key}>
          <dt>{t(String(key))}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function RecapHistoryRow({
  session,
  onSelect,
}: {
  session: SessionSummary;
  onSelect: (id: string) => void;
}) {
  const { t } = useLocale();
  const time = useRecapTime();
  return (
    <button
      type="button"
      className="live-recap-history-row"
      data-session-id={session.id}
      onClick={() => onSelect(session.id)}
    >
      {session.title && (
        <strong className="live-recap-history-row__title">{session.title}</strong>
      )}
      <strong>{time(session.started_at)}</strong>
      <span className="field-hint">
        {[
          t(
            session.is_current
              ? "recap.currentMarker"
              : "recap.completedMarker",
          ),
          ...(session.has_recap ? [t("recap.capturedMarker")] : []),
        ].join(" · ")}
      </span>
      <span>
        {t("recap.historyTotals", {
          viewers: session.totals.viewer_count,
          messages: session.totals.message_count,
          xp: session.totals.xp,
        })}
      </span>
    </button>
  );
}
export function RecapDetail({
  detail,
  historical = false,
  allTime,
  window = "session",
}: {
  detail: SessionDetail;
  historical?: boolean;
  allTime?: RecapPresentation | null;
  window?: "session" | "all";
}) {
  const { t } = useLocale();
  const time = useRecapTime();
  const all = window === "all";
  const source = all
    ? allTime
      ? {
          ...allTime,
          ranking: allTime.ranking.slice(0, 5),
          achievement_groups: [],
        }
      : null
    : detail.snapshot || detail;
  return (
    <>
      <h3 tabIndex={-1}>
        {t(
          all
            ? "recap.allTimeSummary"
            : historical
              ? "recap.sessionDetail"
              : "recap.currentSummary",
        )}
      </h3>
      {!all && detail.title && (
        <p className="live-recap-session-name">{detail.title}</p>
      )}
      {!all && (
        <p className="field-hint">
          {t("recap.startedAt", { time: time(detail.started_at) })}
        </p>
      )}
      {!all && detail.snapshot?.captured_at && (
        <p className="field-hint">
          {t("recap.capturedAt", { time: time(detail.snapshot.captured_at) })}
        </p>
      )}
      {all && allTime?.generated_at && (
        <p className="field-hint">
          {t("recap.allTimeGeneratedAt", { time: time(allTime.generated_at) })}
        </p>
      )}
      {source && (
        <>
          <RecapTotalsView totals={source.totals} />
          {!!source.ranking?.length && (
            <section>
              <h3>{t("recap.topViewers")}</h3>
              <ol className="live-recap-ranking">
                {source.ranking.map((entry, index) => (
                  <li key={index}>
                    <Portrait
                      url={entry.portrait_url}
                      name={entry.display_name}
                    />
                    <span className="live-recap-ranking__copy">
                      <strong>
                        {entry.display_name || t("viewers.unnamed")}
                      </strong>
                      {entry.title && <small>{entry.title}</small>}
                    </span>
                    <span className="live-recap-ranking__meta">
                      {t("recap.rankingMeta", {
                        xp: entry.xp || 0,
                        messages: entry.message_count || 0,
                      })}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {!!source.achievement_groups?.length && (
            <section>
              <h3>{t("recap.achievements")}</h3>
              <ul className="live-recap-achievements">
                {source.achievement_groups.map((group, index) => (
                  <li key={index}>
                    <Portrait
                      url={group.viewer_portrait_url}
                      name={group.viewer_display_name}
                    />
                    <span>
                      <strong>
                        {group.viewer_display_name || t("viewers.unnamed")}
                      </strong>
                      <span>{group.name}</span>
                      {group.description && <small>{group.description}</small>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      {!source?.ranking?.length && !source?.achievement_groups?.length && (
        <p className="empty-state">
          {t(all ? "recap.emptyAllTime" : "recap.emptySession")}
        </p>
      )}
    </>
  );
}
