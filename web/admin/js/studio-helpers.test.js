import assert from "node:assert/strict";
import {
  overlayDraftIsDirty,
  cloneOverlayAppearanceDraft,
  overlaySourceURL,
  buildDockMessagesURL,
  sourceUrlOmitsPreset,
  sourceUrlPinsPreset,
  normalizeOverlayAppearanceDraft,
  normalizeStudioSurface,
  buildFollowActiveURLForSurface,
} from "./studio-helpers.js";
import { buildObsOverlayURL } from "./overlay-url.js";
import { buildLeaderboardURL } from "./leaderboard-url.js";

const ORIGIN = "http://127.0.0.1:17877";

assert.equal(
  overlaySourceURL({ origin: ORIGIN, pathname: "/overlay", followActive: true }),
  ORIGIN + "/overlay"
);
assert.equal(
  overlaySourceURL({ origin: ORIGIN, pathname: "/overlay", presetId: "abc" }),
  ORIGIN + "/overlay?preset=abc"
);
assert.equal(buildObsOverlayURL({ origin: ORIGIN, followActive: true }), ORIGIN + "/overlay");
assert.equal(
  buildObsOverlayURL({ origin: ORIGIN, presetId: "scene-a" }),
  ORIGIN + "/overlay?preset=scene-a"
);
assert.equal(buildObsOverlayURL("legacy-id"), "http://127.0.0.1/overlay?preset=legacy-id");

const followLeaderboard = buildLeaderboardURL({ origin: ORIGIN, period: "session", followActive: true });
assert.ok(sourceUrlOmitsPreset(ORIGIN, followLeaderboard));
assert.equal(new URL(followLeaderboard).searchParams.get("period"), "session");

const pinnedLeaderboard = buildLeaderboardURL({
  origin: ORIGIN,
  period: "day",
  preset: "preset-1",
  layout: "chips",
  fontSizePx: 20,
});
assert.ok(sourceUrlPinsPreset(pinnedLeaderboard, "preset-1"));
assert.equal(new URL(pinnedLeaderboard).searchParams.get("layout"), "chips");
assert.equal(new URL(pinnedLeaderboard).searchParams.get("font_size_px"), "20");

assert.equal(buildDockMessagesURL(ORIGIN), ORIGIN + "/dock/messages");
assert.ok(sourceUrlOmitsPreset(ORIGIN, buildDockMessagesURL(ORIGIN)));

const baseline = normalizeOverlayAppearanceDraft({
  max_messages: 30,
  message_ttl_seconds: 20,
  font_size_px: 18,
  display_mode: "normal",
  theme: "default",
  active_preset_id: "default",
  presets: [{ id: "default", name: "Default", font_size_px: 18, theme: "default" }],
});
const draftCopy = cloneOverlayAppearanceDraft(baseline);
assert.equal(overlayDraftIsDirty(baseline, draftCopy), false);

const dirtyDraft = cloneOverlayAppearanceDraft(baseline);
dirtyDraft.max_messages = 25;
assert.equal(overlayDraftIsDirty(baseline, dirtyDraft), true);

const reordered = cloneOverlayAppearanceDraft({
  ...baseline,
  presets: [
    { id: "default", name: "Default", font_size_px: 18, theme: "default" },
    { id: "b", name: "B", font_size_px: 18, theme: "default" },
  ],
});
const reorderedOther = cloneOverlayAppearanceDraft({
  ...baseline,
  presets: [
    { id: "b", name: "B", font_size_px: 18, theme: "default" },
    { id: "default", name: "Default", font_size_px: 18, theme: "default" },
  ],
});
assert.equal(overlayDraftIsDirty(reordered, reorderedOther), false);

assert.equal(normalizeStudioSurface("chat"), "chat");
assert.equal(normalizeStudioSurface("leaderboard"), "leaderboard");
assert.equal(normalizeStudioSurface("alerts"), "alerts");
assert.equal(normalizeStudioSurface("dock"), "chat");
assert.equal(normalizeStudioSurface(""), "chat");
assert.equal(normalizeStudioSurface(null), "chat");

const followChat = buildFollowActiveURLForSurface("chat", { origin: ORIGIN });
assert.equal(followChat, ORIGIN + "/overlay");
assert.ok(sourceUrlOmitsPreset(ORIGIN, followChat));

const followLeaderboardSurface = buildFollowActiveURLForSurface("leaderboard", {
  origin: ORIGIN,
  period: "day",
});
assert.ok(sourceUrlOmitsPreset(ORIGIN, followLeaderboardSurface));
assert.equal(new URL(followLeaderboardSurface).searchParams.get("period"), "day");
assert.equal(new URL(followLeaderboardSurface).pathname, "/overlay/leaderboard");

const followAlerts = buildFollowActiveURLForSurface("alerts", { origin: ORIGIN });
assert.equal(followAlerts, ORIGIN + "/overlay/alert");
assert.ok(sourceUrlOmitsPreset(ORIGIN, followAlerts));

const invalidSurfaceUrl = buildFollowActiveURLForSurface("dock", { origin: ORIGIN });
assert.equal(invalidSurfaceUrl, ORIGIN + "/overlay");

console.log("studio-helpers OK");
