import assert from "node:assert/strict";
import test from "node:test";
import {
  SETTINGS_SECTIONS,
  SETTINGS_EDITABLE_SECTIONS,
  DEFAULT_SETTINGS_SECTION,
  isSettingsWorkspaceHash,
  parseSettingsSectionFromHash,
  settingsSectionHash,
  extractSectionValuesFromConfig,
  normalizeSectionValues,
  settingsSectionDirty,
  applySectionToConfig,
  proxyRequiredForPayload,
} from "../src/features/settings/model.js";
import {
  buildCommandPayload,
  commandUsesAlertPresentation,
  normalizeCommandAction,
} from "../src/features/catalog/command-model.js";

test("application command audio defaults on and explicit off survives form composition", function () {
  const legacy = { admin: { time_locale: "en-GB" } };
  const defaults = extractSectionValuesFromConfig(legacy, "application");
  assert.equal(defaults.admin.command_sound_enabled, true);
  defaults.admin.command_sound_enabled = false;
  const saved = applySectionToConfig(legacy, "application", defaults);
  assert.equal(saved.admin.command_sound_enabled, false);
  assert.equal(extractSectionValuesFromConfig(saved, "application").admin.command_sound_enabled, false);
  assert.equal(settingsSectionDirty(extractSectionValuesFromConfig(legacy, "application"), defaults, "application"), true);
});

test("command action helpers preserve alerts and strip leaderboard presentation", function () {
  assert.equal(normalizeCommandAction(undefined), "alert");
  assert.equal(normalizeCommandAction("like"), "like");
  assert.equal(normalizeCommandAction("buff"), "buff");
  assert.equal(commandUsesAlertPresentation("alert"), true);
  assert.equal(commandUsesAlertPresentation("like"), false);
  assert.deepEqual(
    buildCommandPayload(
      { trigger: "leaders", enabled: true, action: "show_leaderboard", cooldown_seconds: 30 },
      { splash_template: "unused", duration_ms: 5000 }
    ),
    { trigger: "leaders", aliases: [], enabled: true, action: "show_leaderboard", cooldown_seconds: 30 }
  );
  assert.deepEqual(
    buildCommandPayload(
      { trigger: "like", enabled: true, action: "like", cooldown_seconds: 10, award_id: "viewer_like" },
      { splash_template: "ignored" }
    ),
    {
      trigger: "like",
      aliases: [],
      enabled: true,
      action: "like",
      cooldown_seconds: 10,
      award_id: "viewer_like",
    }
  );
  assert.deepEqual(
    buildCommandPayload(
      { trigger: "buff", enabled: true, action: "buff", cooldown_seconds: 5, points: 25 },
      {}
    ),
    {
      trigger: "buff",
      aliases: [],
      enabled: true,
      action: "buff",
      cooldown_seconds: 5,
      points: 25,
    }
  );
  assert.equal(
    buildCommandPayload(
      { trigger: "hello", enabled: true, action: "alert", cooldown_seconds: 10 },
      { splash_template: "Hi" }
    ).splash_template,
    "Hi"
  );
});

assert.deepEqual(SETTINGS_SECTIONS, [
  "platforms",
  "network",
  "data",
  "application",
  "diagnostics",
]);
assert.deepEqual(SETTINGS_EDITABLE_SECTIONS, ["platforms", "network", "data", "application"]);
assert.equal(DEFAULT_SETTINGS_SECTION, "platforms");

assert.equal(isSettingsWorkspaceHash("#settings"), true);
assert.equal(isSettingsWorkspaceHash("#settings/platforms"), true);
assert.equal(isSettingsWorkspaceHash("#live"), false);
assert.equal(isSettingsWorkspaceHash("#settings-junk"), false);

assert.equal(parseSettingsSectionFromHash("#settings/platforms"), "platforms");
assert.equal(parseSettingsSectionFromHash("#settings/network"), "network");
assert.equal(parseSettingsSectionFromHash("#settings"), null);
assert.equal(parseSettingsSectionFromHash("#settings/unknown"), null);
assert.equal(settingsSectionHash("application"), "#settings/application");

const serverConfig = {
  server_port: 17877,
  activity_interval_seconds: 300,
  activity_session_limit: 10,
  activity_xp: 2,
  buffs_per_award_per_viewer: 1,
  buff_max_unique_viewers: 5,
  day_reset_hour: 8,
  network: { socks5: { address: "127.0.0.1:1080", username: "u", password: "secret" } },
  twitch: { enabled: true, channel: "tester" },
  youtube: {
    enabled: true,
    connection_mode: "api",
    use_proxy: true,
    oauth: { client_id: "id", client_secret: "hidden" },
  },
  vk: { enabled: false, channel: "", use_proxy: false },
  overlay: {
    theme: "default",
    emotes: { twitch: true, ffz: false },
    image_previews: { enabled: false, allowed_hosts: ["example.com"] },
  },
  admin: {
    time_locale: "en-GB",
    message_sound: { enabled: true, volume: 0.5, sound: "chime" },
  },
};

const platformsBaseline = extractSectionValuesFromConfig(serverConfig, "platforms");
assert.equal(platformsBaseline.twitch.channel, "tester");
assert.equal(platformsBaseline.youtube.oauth.client_secret, "");

const platformsDraft = JSON.parse(JSON.stringify(platformsBaseline));
platformsDraft.twitch.channel = "other";
assert.equal(settingsSectionDirty(platformsBaseline, platformsDraft, "platforms"), true);
assert.equal(settingsSectionDirty(platformsBaseline, platformsBaseline, "platforms"), false);

const basePayload = {
  server_port: 17877,
  activity_interval_seconds: 300,
  activity_session_limit: 10,
  activity_xp: 2,
  buffs_per_award_per_viewer: 1,
  buff_max_unique_viewers: 5,
  day_reset_hour: 8,
  network: { socks5: { address: "127.0.0.1:1080", username: "u", password: "" } },
  twitch: { enabled: true, channel: "tester" },
  youtube: { enabled: false, connection_mode: "page", use_proxy: false, oauth: { client_id: "", client_secret: "" } },
  vk: { enabled: false, channel: "", use_proxy: false },
  overlay: { theme: "default", emotes: {}, image_previews: {} },
  admin: { time_locale: "ru-RU", message_sound: { enabled: false, volume: 0.5, sound: "chime" } },
};

const dataValues = {
  activity_interval_seconds: 120,
  activity_session_limit: 5,
  activity_xp: 3,
  day_reset_hour: 12,
  hide_command_messages: true,
  hide_command_cooldown_overlay: true,
  buffs_per_award_per_viewer: 2,
  buff_max_unique_viewers: 8,
};
const withData = applySectionToConfig(basePayload, "data", dataValues);
assert.equal(withData.activity_interval_seconds, 120);
assert.equal(withData.hide_command_messages, true);
assert.equal(withData.hide_command_cooldown_overlay, true);
assert.equal(withData.buffs_per_award_per_viewer, 2);
assert.equal(withData.buff_max_unique_viewers, 8);
assert.equal(withData.activity_session_limit, 5);
assert.equal(withData.activity_xp, 3);
assert.equal(withData.day_reset_hour, 12);
assert.equal(withData.twitch.channel, "tester");

const visibilityData = normalizeSectionValues("data", {
  activity_interval_seconds: 120,
  activity_session_limit: 5,
  activity_xp: 3,
  day_reset_hour: 12,
  leaderboard_visibility: {
    policy: "on_request",
    display_seconds: 20,
    cooldown_seconds: 180,
    dirty_interval_seconds: 0,
    show_on_award: true,
    show_on_rank_change: false,
  },
});
assert.deepEqual(visibilityData.leaderboard_visibility, {
  policy: "on_request",
  display_seconds: 20,
  cooldown_seconds: 180,
  dirty_interval_seconds: 0,
  show_on_award: true,
  show_on_rank_change: false,
});

const appValues = normalizeSectionValues("application", extractSectionValuesFromConfig(serverConfig, "application"));
appValues.admin.time_locale = "ru-RU";
const withApp = applySectionToConfig(basePayload, "application", appValues);
assert.equal(withApp.admin.time_locale, "ru-RU");
assert.equal(withApp.overlay.emotes.ffz, false);

assert.equal(proxyRequiredForPayload({ youtube: { use_proxy: true } }), true);
assert.equal(proxyRequiredForPayload({ youtube: { use_proxy: false }, vk: { use_proxy: false } }), false);
