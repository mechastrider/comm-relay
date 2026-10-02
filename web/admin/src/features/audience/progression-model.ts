export interface Level {
  id: string;
  title: string;
  min_xp: number;
  announce: boolean;
  like_quota: number;
  buff_quota: number;
}
export interface Revision {
  metric: string;
  subject_id?: string;
  subject_label?: string;
  target: number;
  repeatable: boolean;
}
export interface Achievement {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  secret: boolean;
  announce: boolean;
  revision: Revision;
}
export interface ProgressionSettings {
  level_enabled: boolean;
  achievement_enabled: boolean;
  layout: string;
  sound: string;
  sound_volume: number;
  duration_ms: number;
}
export type Values = Record<string, string | boolean>;
export type Group = "level" | "achievement" | "settings";
export const fieldMap: Record<Group, Record<string, string>> = {
  level: {
    id: "id",
    title: "title",
    xp: "min_xp",
    announce: "announce",
    "like-quota": "like_quota",
    "buff-quota": "buff_quota",
  },
  achievement: {
    id: "id",
    name: "name",
    description: "description",
    metric: "metric",
    subject: "subject_id",
    target: "target",
    enabled: "enabled",
    secret: "secret",
    repeatable: "repeatable",
    announce: "announce",
  },
  settings: {
    "level-alert-enabled": "level_enabled",
    "achievement-alert-enabled": "achievement_enabled",
    "alert-layout": "layout",
    "alert-sound": "sound",
    "alert-volume": "sound_volume",
    "alert-duration": "duration_ms",
  },
};
const numeric = new Set([
  "min_xp",
  "like_quota",
  "buff_quota",
  "target",
  "sound_volume",
  "duration_ms",
]);
export function valuesFor(group: Group, source: object): Values {
  const record = source as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(fieldMap[group]).map(([field, key]) => [
      "progression-" + (group === "settings" ? "" : group + "-") + field,
      typeof record[key] === "boolean"
        ? record[key]
        : String(record[key] ?? ""),
    ]),
  );
}
export function payloadFor(
  group: Group,
  values: Values,
): Record<string, string | boolean | number> {
  const payload = Object.fromEntries(
    Object.entries(fieldMap[group]).map(([field, key]) => {
      const value =
        values[
          "progression-" + (group === "settings" ? "" : group + "-") + field
        ];
      return [key, numeric.has(key) ? Number(value) : value];
    }),
  );
  if (group === "achievement") payload.subject_label = payload.subject_id;
  return payload;
}
export const emptyLevel: Level = {
  id: "",
  title: "",
  min_xp: 0,
  announce: true,
  like_quota: 1,
  buff_quota: 1,
};
export const emptyAchievement: Achievement = {
  id: "",
  name: "",
  description: "",
  enabled: true,
  secret: false,
  announce: true,
  revision: {
    metric: "message_count",
    subject_id: "",
    target: 1,
    repeatable: false,
  },
};
export const emptySettings: ProgressionSettings = {
  level_enabled: true,
  achievement_enabled: true,
  layout: "card",
  sound: "",
  sound_volume: 70,
  duration_ms: 5000,
};
