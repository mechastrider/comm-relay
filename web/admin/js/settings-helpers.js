/**
 * Pure helpers for Settings workspace section baselines, dirty state, and save composition.
 */

/** @typedef {"platforms"|"network"|"data"|"application"|"diagnostics"} SettingsSectionId */

/** @type {readonly SettingsSectionId[]} */
export const SETTINGS_SECTIONS = Object.freeze([
  "platforms",
  "network",
  "data",
  "application",
  "diagnostics",
]);

/** @type {readonly SettingsSectionId[]} */
export const SETTINGS_EDITABLE_SECTIONS = Object.freeze([
  "platforms",
  "network",
  "data",
  "application",
]);

/** @type {SettingsSectionId} */
export const DEFAULT_SETTINGS_SECTION = "platforms";

/**
 * @param {string | null | undefined} hash
 * @returns {boolean}
 */
export function isSettingsWorkspaceHash(hash) {
  if (!hash || hash === "#" || hash === "") {
    return false;
  }
  const raw = hash.charAt(0) === "#" ? hash.slice(1) : hash;
  const root = raw.toLowerCase().split("/")[0];
  return root === "settings";
}

/**
 * @param {string | null | undefined} hash
 * @returns {SettingsSectionId | null}
 */
export function parseSettingsSectionFromHash(hash) {
  if (!hash || hash === "#" || hash === "") {
    return null;
  }
  const raw = hash.charAt(0) === "#" ? hash.slice(1) : hash;
  const parts = raw.toLowerCase().split("/").filter(Boolean);
  if (parts[0] !== "settings" || parts.length < 2) {
    return null;
  }
  const section = parts[1];
  return SETTINGS_SECTIONS.includes(/** @type {SettingsSectionId} */ (section))
    ? /** @type {SettingsSectionId} */ (section)
    : null;
}

/**
 * @param {SettingsSectionId} sectionId
 * @returns {string}
 */
export function settingsSectionHash(sectionId) {
  return "#settings/" + sectionId;
}

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
function asObject(value) {
  return value && typeof value === "object" ? /** @type {Record<string, unknown>} */ (value) : {};
}

/**
 * @param {unknown} config
 * @param {SettingsSectionId} sectionId
 * @returns {Record<string, unknown>}
 */
export function extractSectionValuesFromConfig(config, sectionId) {
  const cfg = asObject(config);
  const overlay = asObject(cfg.overlay);
  const admin = asObject(cfg.admin);
  const network = asObject(cfg.network);
  const socks5 = asObject(network.socks5);
  const youtube = asObject(cfg.youtube);
  const oauth = asObject(youtube.oauth);
  const vk = asObject(cfg.vk);

  switch (sectionId) {
    case "platforms":
      return {
        twitch: {
          enabled: Boolean(asObject(cfg.twitch).enabled),
          channel: String(asObject(cfg.twitch).channel || "").toLowerCase(),
        },
        youtube: {
          enabled: Boolean(youtube.enabled),
          connection_mode: youtube.connection_mode === "api" ? "api" : "page",
          video_input: String(youtube.video_input || ""),
          channel_handle: String(youtube.channel_handle || ""),
          chat_mode:
            youtube.chat_mode === "poll" || youtube.chat_mode === "auto"
              ? youtube.chat_mode
              : "stream",
          use_proxy: Boolean(youtube.use_proxy),
          oauth: {
            client_id: String(oauth.client_id || ""),
            client_secret: "",
          },
        },
        vk: {
          enabled: Boolean(vk.enabled),
          channel: String(vk.channel || ""),
          use_proxy: Boolean(vk.use_proxy),
        },
      };
    case "network":
      return {
        server_port: typeof cfg.server_port === "number" ? cfg.server_port : 17877,
        network: {
          socks5: {
            address: String(socks5.address || ""),
            username: String(socks5.username || ""),
            password: "",
          },
        },
      };
    case "data":
      return {
        activity_interval_seconds:
          typeof cfg.activity_interval_seconds === "number" ? cfg.activity_interval_seconds : 300,
        activity_session_limit:
          typeof cfg.activity_session_limit === "number" ? cfg.activity_session_limit : 10,
        activity_xp: typeof cfg.activity_xp === "number" ? cfg.activity_xp : 1,
        day_reset_hour: typeof cfg.day_reset_hour === "number" ? cfg.day_reset_hour : 6,
        hide_command_messages: Boolean(cfg.hide_command_messages),
        custom_avatars_enabled: cfg.custom_avatars_enabled !== false,
        streamer_display_name: String(cfg.streamer_display_name || "").trim(),
      };
    case "application": {
      const messageSound = asObject(admin.message_sound);
      const emotes = asObject(overlay.emotes);
      const previews = asObject(overlay.image_previews);
      return {
        admin: {
          time_locale: admin.time_locale === "en-GB" ? "en-GB" : "ru-RU",
          message_sound: {
            enabled: Boolean(messageSound.enabled),
            volume: typeof messageSound.volume === "number" ? messageSound.volume : 0.5,
            sound: typeof messageSound.sound === "string" ? messageSound.sound : "chime",
          },
        },
        rich_chat: {
          emotes: {
            twitch: emotes.twitch !== false,
            youtube: emotes.youtube !== false,
            vk: emotes.vk !== false,
            ffz: emotes.ffz !== false,
            bttv: emotes.bttv !== false,
            "7tv": emotes["7tv"] !== false,
          },
          image_previews: {
            enabled: Boolean(previews.enabled),
            allowed_hosts: Array.isArray(previews.allowed_hosts)
              ? previews.allowed_hosts.map(String)
              : [],
            max_width_px: typeof previews.max_width_px === "number" ? previews.max_width_px : 320,
            max_height_px: typeof previews.max_height_px === "number" ? previews.max_height_px : 180,
            max_per_message:
              typeof previews.max_per_message === "number" ? previews.max_per_message : 1,
          },
        },
      };
    }
    default:
      return {};
  }
}

/**
 * @param {SettingsSectionId} sectionId
 * @param {unknown} values
 * @returns {Record<string, unknown>}
 */
export function normalizeSectionValues(sectionId, values) {
  const raw = asObject(values);
  if (sectionId === "platforms") {
    const twitch = asObject(raw.twitch);
    const youtube = asObject(raw.youtube);
    const youtubeOauth = asObject(youtube.oauth);
    const vk = asObject(raw.vk);
    return {
      twitch: {
        enabled: Boolean(twitch.enabled),
        channel: String(twitch.channel || "").trim().toLowerCase(),
      },
      youtube: {
        enabled: Boolean(youtube.enabled),
        connection_mode: youtube.connection_mode === "api" ? "api" : "page",
        video_input: String(youtube.video_input || "").trim(),
        channel_handle: String(youtube.channel_handle || "").trim(),
        chat_mode:
          youtube.chat_mode === "poll" || youtube.chat_mode === "auto"
            ? youtube.chat_mode
            : "stream",
        use_proxy: Boolean(youtube.use_proxy),
        oauth: {
          client_id: String(youtubeOauth.client_id || "").trim(),
          client_secret: String(youtubeOauth.client_secret || ""),
        },
      },
      vk: {
        enabled: Boolean(vk.enabled),
        channel: String(vk.channel || "").trim().toLowerCase(),
        use_proxy: Boolean(vk.use_proxy),
      },
    };
  }

  if (sectionId === "network") {
    const network = asObject(raw.network);
    const socks5 = asObject(network.socks5);
    return {
      server_port: Number.parseInt(String(raw.server_port), 10),
      network: {
        socks5: {
          address: String(socks5.address || "").trim(),
          username: String(socks5.username || "").trim(),
          password: String(socks5.password || ""),
        },
      },
    };
  }

  if (sectionId === "data") {
    return {
      activity_interval_seconds: Number.parseInt(String(raw.activity_interval_seconds), 10),
      activity_session_limit: Number.parseInt(String(raw.activity_session_limit), 10),
      activity_xp: Number.parseInt(String(raw.activity_xp), 10),
      day_reset_hour: Number.parseInt(String(raw.day_reset_hour), 10),
      hide_command_messages: Boolean(raw.hide_command_messages),
      custom_avatars_enabled: raw.custom_avatars_enabled !== false,
      streamer_display_name: String(raw.streamer_display_name || "").trim(),
    };
  }

  if (sectionId === "application") {
    const admin = asObject(raw.admin);
    const messageSound = asObject(admin.message_sound);
    const richChat = asObject(raw.rich_chat);
    const emotes = asObject(richChat.emotes);
    const previews = asObject(richChat.image_previews);
    return {
      admin: {
        time_locale: admin.time_locale === "en-GB" ? "en-GB" : "ru-RU",
        message_sound: {
          enabled: Boolean(messageSound.enabled),
          volume: Number(messageSound.volume),
          sound: String(messageSound.sound || "chime"),
        },
      },
      rich_chat: {
        emotes: {
          twitch: Boolean(emotes.twitch),
          youtube: Boolean(emotes.youtube),
          vk: Boolean(emotes.vk),
          ffz: Boolean(emotes.ffz),
          bttv: Boolean(emotes.bttv),
          "7tv": Boolean(emotes["7tv"]),
        },
        image_previews: {
          enabled: Boolean(previews.enabled),
          allowed_hosts: Array.isArray(previews.allowed_hosts)
            ? previews.allowed_hosts.map(function (host) {
                return String(host).trim().toLowerCase();
              }).filter(Boolean)
            : [],
          max_width_px: Number.parseInt(String(previews.max_width_px), 10),
          max_height_px: Number.parseInt(String(previews.max_height_px), 10),
          max_per_message: Number.parseInt(String(previews.max_per_message), 10),
        },
      },
    };
  }

  return {};
}

/**
 * @param {unknown} baseline
 * @param {unknown} draft
 * @param {SettingsSectionId} sectionId
 * @returns {boolean}
 */
export function settingsSectionDirty(baseline, draft, sectionId) {
  if (!SETTINGS_EDITABLE_SECTIONS.includes(sectionId)) {
    return false;
  }
  return (
    JSON.stringify(normalizeSectionValues(sectionId, baseline)) !==
    JSON.stringify(normalizeSectionValues(sectionId, draft))
  );
}

/**
 * Merge one editable section onto a full config update document built from the server.
 *
 * @param {Record<string, unknown>} basePayload
 * @param {SettingsSectionId} sectionId
 * @param {unknown} sectionValues
 * @returns {Record<string, unknown>}
 */
export function applySectionToConfig(basePayload, sectionId, sectionValues) {
  const next = JSON.parse(JSON.stringify(basePayload || {}));
  const values = normalizeSectionValues(sectionId, sectionValues);

  if (sectionId === "platforms") {
    const platforms = /** @type {ReturnType<typeof normalizeSectionValues>} */ (values);
    next.twitch = platforms.twitch;
    next.youtube = platforms.youtube;
    next.vk = platforms.vk;
    return next;
  }

  if (sectionId === "network") {
    const networkSection = /** @type {ReturnType<typeof normalizeSectionValues>} */ (values);
    next.server_port = networkSection.server_port;
    next.network = networkSection.network;
    return next;
  }

  if (sectionId === "data") {
    const data = /** @type {ReturnType<typeof normalizeSectionValues>} */ (values);
    next.activity_interval_seconds = data.activity_interval_seconds;
    next.activity_session_limit = data.activity_session_limit;
    next.activity_xp = data.activity_xp;
    next.day_reset_hour = data.day_reset_hour;
    next.hide_command_messages = data.hide_command_messages;
    next.custom_avatars_enabled = data.custom_avatars_enabled;
    next.streamer_display_name = data.streamer_display_name;
    return next;
  }

  if (sectionId === "application") {
    const application = /** @type {ReturnType<typeof normalizeSectionValues>} */ (values);
    next.admin = application.admin;
    const overlay = asObject(next.overlay);
    const richChat = asObject(application.rich_chat);
    next.overlay = Object.assign({}, overlay, {
      emotes: richChat.emotes,
      image_previews: richChat.image_previews,
    });
    return next;
  }

  return next;
}

/**
 * @param {unknown} payload
 * @returns {boolean}
 */
export function proxyRequiredForPayload(payload) {
  const cfg = asObject(payload);
  const youtube = asObject(cfg.youtube);
  const vk = asObject(cfg.vk);
  return Boolean(youtube.use_proxy || vk.use_proxy);
}
