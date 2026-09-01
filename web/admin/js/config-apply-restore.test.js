import assert from "node:assert/strict";
import {
  resolveStudioDraftAfterConfigApply,
  partitionSettingsSectionsForConfigApply,
} from "./config-apply-restore.js";
import {
  cloneOverlayAppearanceDraft,
  normalizeOverlayAppearanceDraft,
  overlayDraftIsDirty,
} from "./studio-helpers.js";
import {
  SETTINGS_EDITABLE_SECTIONS,
  extractSectionValuesFromConfig,
  settingsSectionDirty,
} from "./settings-helpers.js";

const serverOverlay = normalizeOverlayAppearanceDraft({
  max_messages: 30,
  message_ttl_seconds: 20,
  font_size_px: 18,
  display_mode: "normal",
  theme: "default",
  active_preset_id: "preset-b",
  presets: [{ id: "preset-b", name: "B", font_size_px: 18, theme: "default" }],
});

const baseline = cloneOverlayAppearanceDraft(serverOverlay);
const dirtyDraft = cloneOverlayAppearanceDraft(baseline);
dirtyDraft.max_messages = 12;

const dirtyResolved = resolveStudioDraftAfterConfigApply({
  serverOverlay,
  baseline,
  draft: dirtyDraft,
  isDirty: true,
});
assert.equal(dirtyResolved.shouldResetFromServer, false);
assert.equal(dirtyResolved.overlayToApply.max_messages, 12);
assert.equal(overlayDraftIsDirty(baseline, dirtyResolved.nextDraft), true);
assert.notEqual(
  JSON.stringify(dirtyResolved.overlayToApply),
  JSON.stringify(normalizeOverlayAppearanceDraft(serverOverlay))
);

const dirtyActivatedServer = cloneOverlayAppearanceDraft(serverOverlay);
dirtyActivatedServer.active_preset_id = "preset-c";
const dirtyActivated = resolveStudioDraftAfterConfigApply({
  serverOverlay: dirtyActivatedServer,
  baseline,
  draft: dirtyDraft,
  isDirty: true,
});
assert.equal(dirtyActivated.shouldResetFromServer, false);
assert.equal(dirtyActivated.nextDraft.active_preset_id, "preset-c");
assert.equal(dirtyActivated.nextBaseline.active_preset_id, "preset-c");
assert.equal(dirtyActivated.nextDraft.max_messages, 12);
assert.equal(dirtyActivated.overlayToApply.max_messages, 12);

const dirtyActivatedNoChange = resolveStudioDraftAfterConfigApply({
  serverOverlay,
  baseline,
  draft: dirtyDraft,
  isDirty: true,
});
assert.equal(dirtyActivatedNoChange.nextDraft.active_preset_id, "preset-b");
assert.equal(dirtyActivatedNoChange.nextDraft.max_messages, 12);

const activatedServerOverlay = cloneOverlayAppearanceDraft(serverOverlay);
activatedServerOverlay.active_preset_id = "preset-c";
const cleanResolved = resolveStudioDraftAfterConfigApply({
  serverOverlay: activatedServerOverlay,
  baseline,
  draft: dirtyDraft,
  isDirty: false,
});
assert.equal(cleanResolved.shouldResetFromServer, true);
assert.equal(cleanResolved.overlayToApply.active_preset_id, "preset-c");
assert.equal(overlayDraftIsDirty(cleanResolved.nextBaseline, cleanResolved.nextDraft), false);

const serverConfig = {
  server_port: 17877,
  points_per_message: 2,
  day_reset_hour: 8,
  network: { socks5: { address: "", username: "", password: "" } },
  twitch: { enabled: true, channel: "server" },
  youtube: { enabled: false, connection_mode: "page", use_proxy: false, oauth: { client_id: "", client_secret: "" } },
  vk: { enabled: false, channel: "", use_proxy: false },
  overlay: { theme: "default", emotes: {}, image_previews: {} },
  admin: { time_locale: "ru-RU", message_sound: { enabled: false, volume: 0.5, sound: "chime" } },
};

const platformsBaseline = extractSectionValuesFromConfig(serverConfig, "platforms");
const platformsDraft = JSON.parse(JSON.stringify(platformsBaseline));
platformsDraft.twitch.channel = "draft-channel";
assert.equal(settingsSectionDirty(platformsBaseline, platformsDraft, "platforms"), true);

const unrelatedApplyConfig = JSON.parse(JSON.stringify(serverConfig));
unrelatedApplyConfig.points_per_message = 9;

const plan = partitionSettingsSectionsForConfigApply(SETTINGS_EDITABLE_SECTIONS, ["platforms"]);
assert.deepEqual(plan.restoreSections, ["platforms"]);
assert.deepEqual(plan.resetSections, ["network", "data", "application"]);

const simulatedDomAfterApply = extractSectionValuesFromConfig(unrelatedApplyConfig, "platforms");
assert.equal(
  settingsSectionDirty(platformsBaseline, simulatedDomAfterApply, "platforms"),
  false,
  "without restore, unrelated applyConfig would clear dirty state"
);

const restoredValues = platformsDraft;
assert.equal(settingsSectionDirty(platformsBaseline, restoredValues, "platforms"), true);

const cleanPlan = partitionSettingsSectionsForConfigApply(SETTINGS_EDITABLE_SECTIONS, []);
assert.deepEqual(cleanPlan.restoreSections, []);
assert.deepEqual(cleanPlan.resetSections, SETTINGS_EDITABLE_SECTIONS);

console.log("config-apply-restore OK");
