// Convert progression events to the same scheduling envelope as ordinary alerts.
export function progressionAlertFromFrame(frame) {
  if (!frame || frame.type !== "viewer_progression") return null;
  const level = frame.level && typeof frame.level === "object" ? frame.level : null;
  const achievements = Array.isArray(frame.achievements) ? frame.achievements : [];
  if ((!level || typeof level.title !== "string" || !level.title.trim()) && achievements.length === 0) return null;
  const name = typeof frame.display_name === "string" && frame.display_name.trim() ? frame.display_name.trim() : "Viewer";
  return {
    source: "progression",
    viewer_id: typeof frame.viewer_id === "string" ? frame.viewer_id : "preview",
    name,
    avatar_url: typeof frame.avatar_url === "string" ? frame.avatar_url : "",
    text: name,
    points: 0,
    created_at: typeof frame.created_at === "string" ? frame.created_at : new Date().toISOString(),
    level,
    achievements,
    sound: typeof frame.sound === "string" ? frame.sound : "",
    sound_volume: Number.isFinite(frame.sound_volume) ? frame.sound_volume : 100,
    duration_ms: Number.isFinite(frame.duration_ms) && frame.duration_ms > 0 ? frame.duration_ms : 5000,
  };
}
