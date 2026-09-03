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
  messageTtlToChipValue,
  isMessageTtlChipValue,
  chipValueToMessageTtl,
  parseAddToObsDismissedValue,
  readAddToObsDismissedPreference,
  writeAddToObsDismissedPreference,
  MESSAGE_TTL_CHIP_VALUES,
  shouldShowUseOnStream,
  shouldDisableUseOnStream,
  normalizeStudioSetupState,
  readStudioSetupState,
  writeStudioSetupState,
  normalizeStudioMode,
  readStudioModePreference,
  writeStudioModePreference,
  readStudioSurfaceRailCollapsedPreference,
  writeStudioSurfaceRailCollapsedPreference,
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

const surfaceOpacityDraft = cloneOverlayAppearanceDraft({
  active_preset_id: "default",
  presets: [{
    id: "default",
    name: "Default",
    font_size_px: 18,
    theme: "default",
    surfaces: {
      chat: { panel_opacity: 0 },
      leaderboard: { font_size_px: 14, layout: "chips", panel_opacity: 0.65 },
      alerts: { panel_opacity: 1 },
    },
  }],
});
assert.deepEqual(surfaceOpacityDraft.presets[0].surfaces, {
  chat: { panel_opacity: 0 },
  leaderboard: { font_size_px: 14, layout: "chips", panel_opacity: 0.65 },
  alerts: { panel_opacity: 1 },
});

const dirtyDraft = cloneOverlayAppearanceDraft(baseline);
dirtyDraft.max_messages = 25;
assert.equal(overlayDraftIsDirty(baseline, dirtyDraft), true);

const sameAppearanceOtherPreset = cloneOverlayAppearanceDraft(baseline);
sameAppearanceOtherPreset.active_preset_id = "other-look";
assert.equal(overlayDraftIsDirty(baseline, sameAppearanceOtherPreset), false);

const presetThemeDirty = cloneOverlayAppearanceDraft(baseline);
presetThemeDirty.presets = [
  { id: "default", name: "Default", font_size_px: 18, theme: "dashboard" },
];
assert.equal(overlayDraftIsDirty(baseline, presetThemeDirty), true);

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

assert.deepEqual(MESSAGE_TTL_CHIP_VALUES, [8, 20, 0]);
assert.equal(messageTtlToChipValue(8), 8);
assert.equal(messageTtlToChipValue(20), 20);
assert.equal(messageTtlToChipValue(0), 0);
assert.equal(messageTtlToChipValue(15), null);
assert.equal(messageTtlToChipValue("20"), 20);
assert.equal(isMessageTtlChipValue(20), true);
assert.equal(isMessageTtlChipValue(15), false);
assert.equal(chipValueToMessageTtl(8), 8);
assert.equal(chipValueToMessageTtl(0), 0);
assert.equal(chipValueToMessageTtl(15), null);

assert.equal(parseAddToObsDismissedValue(null), false);
assert.equal(parseAddToObsDismissedValue(undefined), false);
assert.equal(parseAddToObsDismissedValue(""), false);
assert.equal(parseAddToObsDismissedValue("invalid"), false);
assert.equal(parseAddToObsDismissedValue("0"), false);
assert.equal(parseAddToObsDismissedValue("false"), false);
assert.equal(parseAddToObsDismissedValue("true"), true);
assert.equal(parseAddToObsDismissedValue("1"), true);
assert.equal(parseAddToObsDismissedValue("yes"), true);
assert.equal(parseAddToObsDismissedValue(" TRUE "), true);

const missingStorage = {
  getItem() {
    return null;
  },
};
assert.equal(readAddToObsDismissedPreference(missingStorage), false);

const dismissedStorage = {
  values: { "commRelay.studio.addToObsDismissed": "1" },
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.values, key) ? this.values[key] : null;
  },
  setItem(key, value) {
    this.values[key] = String(value);
  },
  removeItem(key) {
    delete this.values[key];
  },
};
assert.equal(readAddToObsDismissedPreference(dismissedStorage), true);
writeAddToObsDismissedPreference(dismissedStorage, false);
assert.equal(readAddToObsDismissedPreference(dismissedStorage), false);
writeAddToObsDismissedPreference(dismissedStorage, true);
assert.equal(readAddToObsDismissedPreference(dismissedStorage), true);

assert.equal(shouldShowUseOnStream("look-a", "look-b"), true);
assert.equal(shouldShowUseOnStream("look-a", "look-a"), false);
assert.equal(shouldShowUseOnStream("", "look-a"), false);
assert.equal(shouldShowUseOnStream("look-a", ""), false);
assert.equal(shouldDisableUseOnStream(true, false, false), false);
assert.equal(shouldDisableUseOnStream(true, true, false), true);
assert.equal(shouldDisableUseOnStream(true, false, true), true);
assert.equal(shouldDisableUseOnStream(false, false, false), true);

assert.equal(normalizeStudioSetupState("seen"), "seen");
assert.equal(normalizeStudioSetupState("skipped"), "skipped");
assert.equal(normalizeStudioSetupState("completed"), "completed");
assert.equal(normalizeStudioSetupState("invalid"), "unseen");
assert.equal(readStudioSetupState(missingStorage), "unseen");
assert.equal(readStudioSetupState(dismissedStorage), "completed");
writeStudioSetupState(dismissedStorage, "seen");
assert.equal(readStudioSetupState(dismissedStorage), "seen");
writeStudioSetupState(dismissedStorage, "skipped");
assert.equal(readStudioSetupState(dismissedStorage), "skipped");
writeStudioSetupState(dismissedStorage, "completed");
assert.equal(readStudioSetupState(dismissedStorage), "completed");

assert.equal(normalizeStudioMode("all"), "all");
assert.equal(normalizeStudioMode("expert"), "essentials");
assert.equal(readStudioModePreference(missingStorage), "essentials");
writeStudioModePreference(dismissedStorage, "all");
assert.equal(readStudioModePreference(dismissedStorage), "all");

assert.equal(readStudioSurfaceRailCollapsedPreference(missingStorage), false);
writeStudioSurfaceRailCollapsedPreference(dismissedStorage, true);
assert.equal(readStudioSurfaceRailCollapsedPreference(dismissedStorage), true);
writeStudioSurfaceRailCollapsedPreference(dismissedStorage, false);
assert.equal(readStudioSurfaceRailCollapsedPreference(dismissedStorage), false);

console.log("studio-helpers OK");
