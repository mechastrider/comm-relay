import {
  mergeStyle,
  defaultStyleForTheme,
  recapDefaultPanelOpacity,
} from "../../../../overlay/overlay-settings";
import {
  resolveLeaderboardFormValues,
  leaderboardPreviewQuery,
  withLeaderboardPresentation,
} from "./leaderboard-presentation";
import {
  resolveAlertsFormValues,
  alertsPreviewQuery,
  withAlertsPresentation,
} from "./alerts-presentation";
import {
  effectiveSurfaceOpacity,
  previewSurfacePanelOpacity,
} from "./surface-opacity";
import type { JsonObject } from "../../services/api";
export type Surface = "chat" | "leaderboard" | "alerts" | "recap";
export type Values = Record<string, string | boolean>;
export interface Preset {
  id: string;
  name: string;
  theme: string;
  max_messages: number;
  message_ttl_seconds: number;
  font_size_px: number;
  display_mode: string;
  style: Record<string, string | number>;
  surfaces: Record<string, Record<string, string | number | boolean>>;
}
export function normalizePreset(value: Partial<Preset>): Preset {
  const theme = value.theme || "default";
  return {
    id: value.id || "default",
    name: value.name || "Default",
    theme,
    max_messages: value.max_messages ?? 30,
    message_ttl_seconds: value.message_ttl_seconds ?? 20,
    font_size_px: value.font_size_px ?? 18,
    display_mode: value.display_mode || "normal",
    style: mergeStyle(theme, value.style),
    surfaces: structuredClone(value.surfaces || {}),
  };
}
export function readPresets(overlay: JsonObject) {
  return Array.isArray(overlay.presets) && overlay.presets.length
    ? overlay.presets.map((value) =>
        normalizePreset(value as unknown as Preset),
      )
    : [normalizePreset(overlay as unknown as Preset)];
}
const top: Record<string, keyof Preset> = {
  "overlay-theme": "theme",
  "overlay-font-size": "font_size_px",
  "overlay-max-messages": "max_messages",
  "overlay-message-ttl": "message_ttl_seconds",
  "overlay-display-mode": "display_mode",
};
const styleKeys = [
  "font_family",
  "line_height",
  "text_edge",
  "text_edge_strength",
  "platform_marker",
  "panel_color",
  "panel_image",
  "panel_image_fit",
  "panel_image_scope",
  "border_width",
  "border_color",
  "border_radius",
];
export function fieldsFor(preset: Preset, surface: Surface): Values {
  const values: Values = {};
  values["overlay-chat-show-level-badges"] = preset.surfaces.chat?.show_level_badges !== false;
  values["overlay-chat-show-command-ammo"] = preset.surfaces.chat?.show_command_ammo !== false;
  values["overlay-leaderboard-show-level-badges"] = preset.surfaces.leaderboard?.show_level_badges !== false;
  for (const [id, key] of Object.entries(top)) values[id] = String(preset[key]);
  for (const key of styleKeys)
    values["overlay-" + key.replaceAll("_", "-")] = String(
      preset.style[key] ?? "",
    );
  const leaderboard = resolveLeaderboardFormValues(
    preset.surfaces.leaderboard,
    preset.font_size_px,
  );
  for (const [key, value] of Object.entries(leaderboard))
    values[
      "overlay-leaderboard-" +
        key
          .replaceAll("_", "-")
          .replace("font-size-px", "font-size")
          .replace("max-entries", "max-entries-all")
    ] = typeof value === "boolean" ? value : String(value);
  const alerts = resolveAlertsFormValues(
    preset.surfaces.alerts,
    preset.font_size_px,
  );
  for (const [key, value] of Object.entries(alerts))
    values[
      "overlay-alerts-" +
        key
          .replaceAll("_", "-")
          .replace("font-size-px", "font-size")
          .replace("image-size-pct", "image-size")
    ] = String(value);
  values["overlay-panel-opacity"] = String(
    effectiveSurfaceOpacity(
      preset.surfaces,
      surface,
      surface === "recap"
        ? recapDefaultPanelOpacity(preset.theme)
        : preset.style.panel_opacity,
    ),
  );
  return values;
}
export function changeField(
  preset: Preset,
  surface: Surface,
  id: string,
  value: string | boolean,
): Preset {
  const next = structuredClone(preset);
  const visualFields: Record<string, [string, string]> = {
    "overlay-chat-show-level-badges": ["chat", "show_level_badges"],
    "overlay-chat-show-command-ammo": ["chat", "show_command_ammo"],
    "overlay-leaderboard-show-level-badges": ["leaderboard", "show_level_badges"],
  };
  if (visualFields[id]) {
    const [target, key] = visualFields[id];
    next.surfaces[target] = { ...next.surfaces[target], [key]: value === true };
    return next;
  }
  if (top[id]) {
    const key = top[id];
    Object.assign(next, {
      [key]: typeof next[key] === "number" ? Number(value) : value,
    });
    return next;
  }
  if (id === "overlay-panel-opacity") {
    next.surfaces[surface] = {
      ...next.surfaces[surface],
      panel_opacity: Number(value),
    };
    return next;
  }
  if (id.startsWith("overlay-leaderboard-")) {
    const key = id
      .slice(20)
      .replaceAll("-", "_")
      .replace("font_size", "font_size_px")
      .replace("max_entries_all", "max_entries");
    const values = {
      ...resolveLeaderboardFormValues(
        next.surfaces.leaderboard,
        next.font_size_px,
      ),
      [key]: ["font_size_px", "max_entries"].includes(key)
        ? Number(value)
        : value,
    };
    const touchedKey: Record<string, string> = {
      sizing_mode: "sizing",
      font_size_px: "font",
      title_mode: "title",
      title: "titleText",
      show_message_count: "messages",
      show_viewer_titles: "titles",
      max_entries: "maxEntries",
    };
    next.surfaces = withLeaderboardPresentation(next.surfaces, values, {
      [touchedKey[key] || key]: true,
    }) as Preset["surfaces"];
    return next;
  }
  if (id.startsWith("overlay-alerts-")) {
    const key = id
      .slice(15)
      .replaceAll("-", "_")
      .replace("font_size", "font_size_px")
      .replace("image_size", "image_size_pct");
    const values = {
      ...resolveAlertsFormValues(next.surfaces.alerts, next.font_size_px),
      inherited_font_size_px: next.font_size_px,
      [key]: key === "sizing_mode" ? value : Number(value),
    };
    const touchedKey: Record<string, string> = {
      sizing_mode: "sizing",
      font_size_px: "font",
      image_size_pct: "imageSize",
    };
    next.surfaces = withAlertsPresentation(next.surfaces, values, {
      [touchedKey[key]]: true,
    }) as Preset["surfaces"];
    if (
      values.sizing_mode === "auto" &&
      next.surfaces.alerts.font_size_px !== undefined
    )
      next.surfaces.alerts.sizing_mode = "auto";
    return next;
  }
  const key = id.slice(8).replaceAll("-", "_");
  if (styleKeys.includes(key))
    next.style[key] =
      typeof next.style[key] === "number" ? Number(value) : String(value);
  return next;
}
export function resetGroup(preset: Preset, surface: Surface, group: string) {
  const next = structuredClone(preset),
    defaults = defaultStyleForTheme(preset.theme);
  if (group === "leaderboard") {
    const opacity = next.surfaces.leaderboard?.panel_opacity;
    next.surfaces.leaderboard =
      opacity === undefined ? {} : { panel_opacity: opacity };
    return next;
  }
  const keys =
    group === "text"
      ? ["font_family", "line_height"]
      : group === "surface"
        ? [
            "panel_color",
            "panel_image",
            "panel_image_fit",
            "panel_image_scope",
            "border_width",
            "border_color",
            "border_radius",
          ]
        : ["text_edge", "text_edge_strength", "platform_marker"];
  for (const key of keys)
    next.style[key] = (defaults as Record<string, string | number>)[key];
  if (group === "surface")
    next.surfaces[surface] = {
      ...next.surfaces[surface],
      panel_opacity:
        surface === "recap"
          ? recapDefaultPanelOpacity(preset.theme)
          : defaults.panel_opacity,
    };
  return next;
}
export const paths: Record<Surface, string> = {
  chat: "/overlay",
  leaderboard: "/overlay/leaderboard",
  alerts: "/overlay/alert",
  recap: "/overlay/recap",
};
export function previewURL(
  preset: Preset,
  surface: Surface,
  mode: string,
  background: string,
  locale: string,
  period: string,
) {
  const url = new URL(paths[surface], location.origin);
  const query: Record<string, unknown> = {
    preview: surface === "chat" ? mode : "sample",
    preview_background: background,
    preset: preset.id,
    theme: preset.theme,
    show_level_badges: preset.surfaces[surface]?.show_level_badges !== false ? "1" : "0",
    show_command_ammo: preset.surfaces.chat?.show_command_ammo !== false ? "1" : "0",
    ...preset.style,
    panel_opacity: previewSurfacePanelOpacity(
      preset,
      surface,
      preset.style.panel_opacity,
    ),
  };
  if (surface === "chat")
    Object.assign(query, {
      max_messages: preset.max_messages,
      message_ttl_seconds: preset.message_ttl_seconds,
      font_size_px: preset.font_size_px,
      display_mode: preset.display_mode,
    });
  if (surface === "leaderboard")
    Object.assign(
      query,
      { period },
      leaderboardPreviewQuery(
        resolveLeaderboardFormValues(
          preset.surfaces.leaderboard,
          preset.font_size_px,
        ),
      ),
    );
  if (surface === "alerts")
    Object.assign(
      query,
      alertsPreviewQuery(
        resolveAlertsFormValues(preset.surfaces.alerts, preset.font_size_px),
      ),
    );
  if (surface === "recap") query.locale = locale;
  for (const [key, value] of Object.entries(query))
    if (value !== undefined && value !== null && value !== "")
      url.searchParams.set(key, String(value));
  return url.href;
}

/** Map config validation paths back to the owning preset/surface/control. */
export function validationTarget(
  key: string,
  presets: Preset[],
  fallback: Surface,
) {
  const match = /^overlay_preset_(\d+)_(.*)$/.exec(key);
  const path = match ? match[2] : key.replace(/^overlay_/, "");
  const surfaceMatch = /^surfaces_(chat|leaderboard|alerts|recap)_(.*)$/.exec(
    path,
  );
  const surface = surfaceMatch ? (surfaceMatch[1] as Surface) : fallback;
  let field = surfaceMatch ? surfaceMatch[2] : path.replace(/^style_/, "");
  if (field === "panel_opacity") field = "panel-opacity";
  else if (surfaceMatch) field = surface + "-" + field;
  field =
    "overlay-" +
    field
      .replaceAll("_", "-")
      .replace(/font-size-px$/, "font-size")
      .replace(/message-ttl-seconds$/, "message-ttl")
      .replace(/max-entries$/, "max-entries-all")
      .replace(/image-size-pct$/, "image-size");
  return {
    preset: match ? presets[Number(match[1])]?.id : undefined,
    surface,
    field,
  };
}
export function resetFields(group: string): string[] {
  const keys =
    group === "text"
      ? ["font-family", "line-height"]
      : group === "surface"
        ? [
            "panel-color",
            "panel-image",
            "panel-image-fit",
            "panel-image-scope",
            "panel-opacity",
            "border-width",
            "border-color",
            "border-radius",
          ]
        : group === "leaderboard"
          ? [
              "leaderboard-sizing-mode",
              "leaderboard-font-size",
              "leaderboard-title-mode",
              "leaderboard-title",
              "leaderboard-show-message-count",
              "leaderboard-show-viewer-titles",
              "leaderboard-max-entries-all",
            ]
          : ["text-edge", "text-edge-strength", "platform-marker"];
  return keys.map((key) => "overlay-" + key);
}
