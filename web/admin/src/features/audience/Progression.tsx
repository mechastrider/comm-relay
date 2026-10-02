import { useReportSaveStatus } from "../../app/save-status";
import { useRef, useState } from "react";
import { useBlocker } from "react-router";
import { useLocale } from "../../app/locale";
import { Dialog } from "../../components/Dialog";
import { ApiError, post } from "../../services/api";
import { useResource } from "../../services/resource";
import type { CatalogRecord } from "../catalog/types";
import { ProgressionView } from "./ProgressionView";
import {
  valuesFor,
  payloadFor,
  fieldMap,
  emptyLevel,
  emptyAchievement,
  emptySettings,
  type Level,
  type Achievement,
  type ProgressionSettings,
  type Values,
  type Group,
  type Revision,
} from "./progression-model";
interface Draft {
  baseline: Values;
  values: Values;
}
export function Progression() {
  const { t } = useLocale();
  const awards = useResource<{ awards: CatalogRecord[] }>("/api/awards");
  const commands = useResource<{ commands: CatalogRecord[] }>("/api/commands");
  const levels = useResource<{ levels: Level[] }>("/api/progression/levels");
  const achievements = useResource<{ achievements: Achievement[] }>(
    "/api/progression/achievements",
  );
  const settings = useResource<ProgressionSettings>(
    "/api/progression/settings",
  );
  const statusResource = useResource<{ state: string }>(
    "/api/progression/status",
  );
  const [levelID, setLevelID] = useState<string | null>(null),
    [achievementID, setAchievementID] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<Group, Draft>>>({});
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all");
  const [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [confirmation, setConfirmation] = useState<{
    message: string;
    run: () => void;
  } | null>(null);
  const list = [...(levels.data?.levels ?? [])].sort(
    (left, right) =>
      left.min_xp - right.min_xp || left.id.localeCompare(right.id),
  );
  const allAchievements = achievements.data?.achievements ?? [];
  const level =
    levelID === ""
      ? emptyLevel
      : (list.find((item) => item.id === levelID) ?? list[0] ?? emptyLevel);
  const achievement =
    achievementID === ""
      ? emptyAchievement
      : (allAchievements.find((item) => item.id === achievementID) ??
        allAchievements[0] ??
        emptyAchievement);
  const source = {
    level: valuesFor("level", level),
    achievement: valuesFor("achievement", {
      ...achievement,
      ...achievement.revision,
    }),
    settings: valuesFor("settings", settings.data ?? emptySettings),
  };
  const values: Values = {
    ...source.level,
    ...source.achievement,
    ...source.settings,
    ...drafts.level?.values,
    ...drafts.achievement?.values,
    ...drafts.settings?.values,
    "progression-achievement-search": query,
    "progression-achievement-filter": filter,
  };
  const isDirty = (group: Group) =>
    !!drafts[group] &&
    JSON.stringify(drafts[group].baseline) !==
      JSON.stringify(drafts[group].values);
  const dirty = (["level", "achievement", "settings"] as const).some(isDirty);
  useReportSaveStatus(dirty, busy);
  const blocker = useBlocker(dirty || busy);
  const clearDraft = (group: Group) => {
    setDrafts((previous) => {
      const next = { ...previous };
      delete next[group];
      return next;
    });
    setErrors({});
    setError("");
  };
  const change = (id: string, value: string | boolean) => {
    if (id === "progression-achievement-search") {
      setQuery(String(value));
      return;
    }
    if (id === "progression-achievement-filter") {
      setFilter(String(value));
      return;
    }
    const group: Group = Object.keys(fieldMap.settings).some(
      (field) => "progression-" + field === id,
    )
      ? "settings"
      : id.startsWith("progression-level-")
        ? "level"
        : "achievement";
    setDrafts((previous) => {
      const draft = previous[group] ?? {
        baseline: source[group],
        values: source[group],
      };
      return {
        ...previous,
        [group]: {
          baseline: draft.baseline,
          values: {
            ...draft.values,
            [id]: value,
            ...(id === "progression-achievement-metric" &&
            draft.values[id] !== value
              ? { "progression-achievement-subject": "" }
              : {}),
          },
        },
      };
    });
    setErrors((previous) => ({ ...previous, [id]: "" }));
    setStatus("");
    setError("");
  };
  const guard = (group: Group, run: () => void) => {
    if (busy) return;
    if (isDirty(group))
      setConfirmation({ message: t("progression.discardConfirm"), run });
    else run();
  };
  const choose = (group: "level" | "achievement", id: string) =>
    guard(group, () => {
      clearDraft(group);
      if (group === "level") setLevelID(id);
      else setAchievementID(id);
      if (!id)
        requestAnimationFrame(() =>
          document
            .getElementById(
              group === "level"
                ? "progression-level-title"
                : "progression-achievement-name",
            )
            ?.focus(),
        );
    });
  const report = (cause: unknown, group?: Group) => {
    const message = cause instanceof Error ? cause.message : String(cause);
    setError(message);
    if (cause instanceof ApiError && group) {
      const fields: Record<string, string> = {};
      for (const [field, key] of Object.entries(fieldMap[group]))
        if (cause.fields[key])
          fields[
            "progression-" + (group === "settings" ? "" : group + "-") + field
          ] = cause.fields[key];
      if (!Object.keys(fields).length && group === "level")
        fields["progression-level-xp"] = message;
      setErrors(fields);
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>(
            '#audience-progression-panel [aria-invalid="true"]',
          )
          ?.focus(),
      );
    }
  };
  const save = async (group: Group) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setErrors({});
    const payload = payloadFor(group, values);
    if (group === "achievement") {
      const catalog =
        payload.metric === "award_count"
          ? awards.data?.awards
          : commands.data?.commands;
      const item = catalog?.find((entry) => entry.id === payload.subject_id);
      payload.subject_label = item
        ? (payload.metric === "award_count"
            ? item.name
            : `!${item.trigger || item.id}`) || item.id
        : payload.subject_id === achievement.revision.subject_id
          ? achievement.revision.subject_label || String(payload.subject_id)
          : String(payload.subject_id);
      if (!["award_count", "command_count"].includes(String(payload.metric)))
        payload.subject_label = "";
    }
    try {
      if (group === "settings") {
        settings.receive(
          await post<ProgressionSettings>(
            "/api/progression/settings/update",
            payload,
          ),
        );
      } else if (group === "level") {
        const saved = await post<Level>(
          "/api/progression/levels/" + (payload.id ? "update" : "create"),
          payload,
        );
        levels.receive({
          levels: list.some((item) => item.id === saved.id)
            ? list.map((item) => (item.id === saved.id ? saved : item))
            : [...list, saved],
        });
        setLevelID(saved.id);
      } else {
        const saved = await post<Achievement>(
          "/api/progression/achievements/" + (payload.id ? "update" : "create"),
          payload,
        );
        achievements.receive({
          achievements: allAchievements.some((item) => item.id === saved.id)
            ? allAchievements.map((item) =>
                item.id === saved.id ? saved : item,
              )
            : [...allAchievements, saved],
        });
        setAchievementID(saved.id);
      }
      clearDraft(group);
      setStatus(t("progression.saved"));
      void statusResource.refresh();
    } catch (cause) {
      report(cause, group);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const remove = async (group: "level" | "achievement") => {
    if (pending.current) return;
    const id = group === "level" ? level.id : achievement.id;
    if (!id || (group === "level" && level.min_xp === 0)) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await post(
        "/api/progression/" +
          (group === "level" ? "levels" : "achievements") +
          "/delete",
        { id },
      );
      if (group === "level") {
        levels.receive({ levels: list.filter((item) => item.id !== id) });
        setLevelID(null);
      } else {
        achievements.receive({
          achievements: allAchievements.filter((item) => item.id !== id),
        });
        setAchievementID(null);
      }
      clearDraft(group);
      setStatus(t("progression.saved"));
    } catch (cause) {
      report(cause, group);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const preview = async (group: "level" | "achievement") => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const payload = payloadFor(group, values),
      appearance = payloadFor("settings", values);
    try {
      const result = await post<{ delivered_clients: number }>(
        "/api/progression/preview",
        {
          kind: group,
          ...(group === "level"
            ? { title: payload.title }
            : { name: payload.name, description: payload.description }),
          layout: appearance.layout,
          sound: appearance.sound,
          sound_volume: appearance.sound_volume,
          duration_ms: appearance.duration_ms,
        },
      );
      setStatus(
        t("progression.preview") + ": " + (result.delivered_clients || 0),
      );
    } catch (cause) {
      report(cause, group);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const reconcile = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await post<{ state: string }>(
        "/api/progression/reconcile",
        {},
      );
      statusResource.receive(result);
      setStatus(t("progression.status") + ": " + result.state);
    } catch (cause) {
      report(cause);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const action = (id: string) => {
    if (id === "progression-level-new") choose("level", "");
    else if (id === "progression-achievement-new") choose("achievement", "");
    else if (id === "progression-level-form") void save("level");
    else if (id === "progression-settings-form") void save("settings");
    else if (id === "progression-achievement-form") {
      const payload = payloadFor("achievement", values),
        old = achievement.revision;
      if (
        achievement.id &&
        (old.metric !== payload.metric ||
          (old.subject_id || "") !== payload.subject_id ||
          old.target !== payload.target ||
          old.repeatable !== payload.repeatable)
      )
        setConfirmation({
          message: t("progression.revisionConfirm"),
          run: () => void save("achievement"),
        });
      else void save("achievement");
    } else if (id === "progression-level-test") void preview("level");
    else if (id === "progression-achievement-test") void preview("achievement");
    else if (
      id === "progression-level-delete" ||
      id === "progression-achievement-delete"
    )
      setConfirmation({
        message: t("progression.deleteConfirm"),
        run: () =>
          void remove(
            id === "progression-level-delete" ? "level" : "achievement",
          ),
      });
    else if (id === "progression-reconcile") void reconcile();
    else if (id === "progression-retry") {
      void levels.refresh();
      void achievements.refresh();
      void settings.refresh();
      void statusResource.refresh();
    }
  };
  const condition = (revision: Revision) => {
    const labels: Record<string, string> = {
      message_count: "progression.metricMessages",
      xp: "progression.metricXP",
      award_count: "progression.metricAwards",
      command_count: "progression.metricCommands",
      session_count: "progression.metricSessions",
      contract_win_count: "progression.metricContracts",
    };
    const catalog =
      revision.metric === "award_count"
        ? awards.data?.awards
        : commands.data?.commands;
    const item = catalog?.find((entry) => entry.id === revision.subject_id);
    const subject = item
      ? (revision.metric === "award_count"
          ? item.name
          : `!${item.trigger || item.id}`) || item.id
      : revision.subject_label || revision.subject_id || "";
    return t("progression.condition", {
      target: revision.target || 1,
      subject: subject ? subject + " " : "",
      metric: t(labels[revision.metric] || revision.metric),
    });
  };
  const filtered = allAchievements.filter(
    (item) =>
      (filter !== "enabled" || item.enabled) &&
      (filter !== "disabled" || !item.enabled) &&
      (filter !== "secret" || item.secret) &&
      (filter !== "repeatable" || item.revision.repeatable) &&
      [
        item.name,
        item.description,
        item.revision.metric,
        item.revision.subject_label,
        item.revision.subject_id,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  const row = (
    group: "level" | "achievement",
    id: string,
    label: string,
    selected: boolean,
  ) => (
    <li
      key={id}
      role="option"
      className={
        "audience-catalog-items__item" +
        (selected ? " audience-catalog-items__item--selected" : "")
      }
      tabIndex={
        selected ||
        ((group === "level" ? levelID : achievementID) === "" &&
          id === (group === "level" ? list[0]?.id : filtered[0]?.id))
          ? 0
          : -1
      }
      aria-selected={selected}
      onClick={() => choose(group, id)}
      onKeyDown={(event) => {
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const options = Array.from(
            event.currentTarget.parentElement?.querySelectorAll<HTMLElement>(
              '[role="option"]',
            ) ?? [],
          );
          const index = options.indexOf(event.currentTarget);
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? options.length - 1
                : Math.max(
                    0,
                    Math.min(
                      options.length - 1,
                      index + (event.key === "ArrowDown" ? 1 : -1),
                    ),
                  );
          options[next]?.focus();
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          choose(group, id);
        }
      }}
    >
      <span className="audience-catalog-items__primary">{label}</span>
    </li>
  );
  const failed = !!(
    levels.error ||
    achievements.error ||
    settings.error ||
    statusResource.error
  );
  const loading =
    levels.loading ||
    achievements.loading ||
    settings.loading ||
    statusResource.loading;
  const cancel = () => {
    setConfirmation(null);
    if (blocker.state === "blocked") blocker.reset();
  };
  return (
    <>
      <ProgressionView
        values={values}
        errors={errors}
        busy={busy || loading}
        baseline={!!level.id && level.min_xp === 0}
        change={change}
        action={action}
        levelList={list.map((item) =>
          row(
            "level",
            item.id,
            item.title +
              " · " +
              item.min_xp +
              " XP · " +
              t("progression.quotaListShort", {
                like: item.like_quota ?? 0,
                buff: item.buff_quota ?? 0,
              }),
            item.id === level.id,
          ),
        )}
        achievementList={filtered.map((item) =>
          row(
            "achievement",
            item.id,
            item.name + " · " + condition(item.revision),
            item.id === achievement.id,
          ),
        )}
        achievementsEmpty={!filtered.length}
        condition={condition({
          metric: String(values["progression-achievement-metric"]),
          subject_id: String(values["progression-achievement-subject"]),
          target: Number(values["progression-achievement-target"]),
          repeatable: Boolean(values["progression-achievement-repeatable"]),
        })}
        status={
          error ||
          levels.error?.message ||
          achievements.error?.message ||
          settings.error?.message ||
          statusResource.error?.message ||
          status ||
          (loading
            ? t("state.loading")
            : statusResource.data?.state
              ? t("progression.status") + ": " + statusResource.data.state
              : "")
        }
        failed={failed}
        subjectOptions={
          (String(values["progression-achievement-metric"]) === "award_count"
            ? awards.data?.awards
            : commands.data?.commands
          )?.map((item) => ({
            id: item.id,
            label:
              (String(values["progression-achievement-metric"]) ===
              "award_count"
                ? item.name
                : `!${item.trigger || item.id}`) || item.id,
          })) ?? []
        }
        subjectLoading={
          awards.loading ||
          commands.loading ||
          (!awards.data && !awards.error) ||
          (!commands.data && !commands.error)
        }
        subjectError={!!(awards.error || commands.error)}
        retrySubjects={() => {
          void awards.refresh();
          void commands.refresh();
        }}
      />
      <Dialog
        id="discard-changes-dialog"
        className="prompt-dialog"
        open={!!confirmation || blocker.state === "blocked"}
        onClose={cancel}
        title={t("dialog.discardUnsavedTitle")}
        actions={
          <>
            <button
              id="discard-changes-cancel"
              className="btn-physical"
              onClick={cancel}
            >
              {t("dialog.keepEditing")}
            </button>
            <button
              id="discard-changes-confirm"
              className="btn-physical btn-danger"
              disabled={busy}
              onClick={() => {
                const callback = confirmation?.run;
                setConfirmation(null);
                if (callback) callback();
                else if (blocker.state === "blocked") blocker.proceed();
              }}
            >
              {t("dialog.discardChanges")}
            </button>
          </>
        }
      >
        <p>{confirmation?.message || t("progression.discardConfirm")}</p>
      </Dialog>
    </>
  );
}
