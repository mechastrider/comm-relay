import schema from "./fields.json";
import {
  extractSectionValuesFromConfig,
  applySectionToConfig,
} from "./model.js";
import type { PublicConfig } from "../../services/types";
import type { FieldValues } from "./Fields";

export type Section = "platforms" | "network" | "data" | "application";
export const sections: Section[] = [
  "platforms",
  "network",
  "data",
  "application",
];
interface Field {
  section: string;
  path: string;
  kind: string;
  scale?: number;
}
export const fields: Record<string, Field> = schema;
function readPath(object: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === "object"
          ? (value as Record<string, unknown>)[key]
          : undefined,
      object,
    );
}
function writePath(
  object: Record<string, unknown>,
  path: string,
  value: unknown,
) {
  const keys = path.split(".");
  let current = object;
  for (const key of keys.slice(0, -1)) {
    if (!current[key] || typeof current[key] !== "object") current[key] = {};
    current = current[key] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}
export function sectionValues(
  config: PublicConfig,
  section: Section,
): FieldValues {
  const source = extractSectionValuesFromConfig(config, section);
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([, field]) => field.section === section)
      .map(([id, field]) => {
        const value = readPath(source, field.path);
        return [
          id,
          field.kind === "boolean"
            ? Boolean(value)
            : field.kind === "lines"
              ? Array.isArray(value)
                ? value.join("\n")
                : ""
              : String(
                  typeof value === "number"
                    ? value * (field.scale ?? 1)
                    : (value ?? ""),
                ),
        ];
      }),
  );
}
/** Build a full update from the fresh server snapshot, never from another draft. */
export function configUpdateBase(config: PublicConfig) {
  return {
    ...config,
    network: {
      socks5: {
        address: config.network.socks5.address,
        username: config.network.socks5.username,
        password: "",
      },
    },
    youtube: {
      ...config.youtube,
      oauth: { client_id: config.youtube.oauth.client_id, client_secret: "" },
    },
  };
}
export function composeSectionUpdate(
  config: PublicConfig,
  section: Section,
  values: FieldValues,
) {
  const draft: Record<string, unknown> = {};
  for (const [id, field] of Object.entries(fields)) {
    if (field.section !== section) continue;
    const raw = values[id];
    const value =
      field.kind === "boolean"
        ? Boolean(raw)
        : field.kind === "number"
          ? String(raw).trim()
            ? Number(raw) / (field.scale ?? 1)
            : Number.NaN
          : field.kind === "lines"
            ? String(raw)
                .split(/[\n,]/)
                .map((item) => item.trim())
                .filter(Boolean)
            : String(raw ?? "");
    writePath(draft, field.path, value);
  }
  return applySectionToConfig(configUpdateBase(config), section, draft);
}
