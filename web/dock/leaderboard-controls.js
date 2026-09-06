export function normalizeVisibilitySnapshot(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const state = ["hidden", "timed", "pinned"].includes(value.state) ? value.state : "hidden";
  const until = typeof value.visible_until === "string" && !Number.isNaN(Date.parse(value.visible_until))
    ? value.visible_until
    : null;
  return {
    state: state,
    policy: typeof value.policy === "string" ? value.policy : "automatic",
    visible: state !== "hidden",
    visible_until: state === "timed" ? until : null,
    reason: typeof value.reason === "string" ? value.reason : "",
  };
}

export function visibilitySecondsRemaining(snapshot, nowMs) {
  if (!snapshot || snapshot.state !== "timed" || !snapshot.visible_until) {
    return 0;
  }
  return Math.max(0, Math.ceil((Date.parse(snapshot.visible_until) - nowMs) / 1000));
}

export function presetOptions(config) {
  const overlay = config && typeof config.overlay === "object" ? config.overlay : {};
  const presets = Array.isArray(overlay.presets) ? overlay.presets : [];
  return {
    activeId: typeof overlay.active_preset_id === "string" ? overlay.active_preset_id : "",
    presets: presets.map(function (preset) {
      return {
        id: String(preset && preset.id || ""),
        name: String(preset && preset.name || preset && preset.id || ""),
      };
    }).filter(function (preset) { return preset.id !== ""; }),
  };
}
