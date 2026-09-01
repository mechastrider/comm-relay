import assert from "node:assert/strict";
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
} from "./settings-helpers.js";

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
  points_per_message: 2,
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
  points_per_message: 2,
  day_reset_hour: 8,
  network: { socks5: { address: "127.0.0.1:1080", username: "u", password: "" } },
  twitch: { enabled: true, channel: "tester" },
  youtube: { enabled: false, connection_mode: "page", use_proxy: false, oauth: { client_id: "", client_secret: "" } },
  vk: { enabled: false, channel: "", use_proxy: false },
  overlay: { theme: "default", emotes: {}, image_previews: {} },
  admin: { time_locale: "ru-RU", message_sound: { enabled: false, volume: 0.5, sound: "chime" } },
};

const dataValues = { points_per_message: 5, day_reset_hour: 12 };
const withData = applySectionToConfig(basePayload, "data", dataValues);
assert.equal(withData.points_per_message, 5);
assert.equal(withData.day_reset_hour, 12);
assert.equal(withData.twitch.channel, "tester");

const appValues = normalizeSectionValues("application", extractSectionValuesFromConfig(serverConfig, "application"));
appValues.admin.time_locale = "ru-RU";
const withApp = applySectionToConfig(basePayload, "application", appValues);
assert.equal(withApp.admin.time_locale, "ru-RU");
assert.equal(withApp.overlay.emotes.ffz, false);

assert.equal(proxyRequiredForPayload({ youtube: { use_proxy: true } }), true);
assert.equal(proxyRequiredForPayload({ youtube: { use_proxy: false }, vk: { use_proxy: false } }), false);

console.log("settings-helpers OK");
