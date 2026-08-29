export const form = document.getElementById("settings-form");
export const appShell = document.getElementById("app-shell");
export const cockpitShell = document.getElementById("live-cockpit") || document.querySelector(".cockpit-shell");
export const workspaceMain = document.getElementById("workspace-main");
export const shellAnnouncements = document.getElementById("shell-announcements");
export const shellDiagnosticsButton = document.getElementById("shell-diagnostics-button");
export const shellStatusBar = document.getElementById("shell-status-bar");
export const sidebarToggle = document.getElementById("sidebar-toggle");
export const saveButtons = Array.from(document.querySelectorAll("[data-save-button]"));
export const settingsState = document.getElementById("settings-state");
export const footerSettingsState = document.getElementById("footer-settings-state");
export const banner = document.getElementById("banner");
export const twitchStatus = document.getElementById("twitch-status");
export const twitchDetail = document.getElementById("twitch-detail");
export const twitchEnabled = document.getElementById("twitch-enabled");
export const twitchChannel = document.getElementById("twitch-channel");
export const networkSocks5Address = document.getElementById("network-socks5-address");
export const networkSocks5Username = document.getElementById("network-socks5-username");
export const networkSocks5Password = document.getElementById("network-socks5-password");
export const youtubeUseProxy = document.getElementById("youtube-use-proxy");
export const vkUseProxy = document.getElementById("vk-use-proxy");
export const youtubeStatus = document.getElementById("youtube-status");
export const youtubeOAuthLabel = document.getElementById("youtube-oauth-label");
export const youtubeDetail = document.getElementById("youtube-detail");
export const youtubeEnabled = document.getElementById("youtube-enabled");
export const youtubeConnectionMode = document.getElementById("youtube-connection-mode");
export const youtubeChannelHandle = document.getElementById("youtube-channel-handle");
export const youtubeVideoInput = document.getElementById("youtube-video-input");
export const youtubePageFields = document.getElementById("youtube-page-fields");
export const youtubeApiFields = document.getElementById("youtube-api-fields");
export const youtubeChatMode = document.getElementById("youtube-chat-mode");
export const youtubeClientId = document.getElementById("youtube-client-id");
export const youtubeClientSecret = document.getElementById("youtube-client-secret");
export const youtubeConnect = document.getElementById("youtube-connect");
export const vkStatus = document.getElementById("vk-status");
export const vkDetail = document.getElementById("vk-detail");
export const diagUptime = document.getElementById("diag-uptime");
export const diagWsClients = document.getElementById("diag-ws-clients");
export const diagMessageCounts = document.getElementById("diag-message-counts");
export const vkEnabled = document.getElementById("vk-enabled");
export const vkChannel = document.getElementById("vk-channel");
if (!vkEnabled || !vkChannel) {
    console.error("VK Live settings controls are missing from the page");
  }
export const overlayMaxMessages = document.getElementById("overlay-max-messages");
export const overlayMessageTTL = document.getElementById("overlay-message-ttl");
export const overlayFontSize = document.getElementById("overlay-font-size");
export const overlayDisplayMode = document.getElementById("overlay-display-mode");
export const overlayTheme = document.getElementById("overlay-theme");
export const overlayDialog = document.getElementById("overlay-dialog");
export const connectionsDialog = document.getElementById("connections-dialog");
export const overlayPreviewFrame = document.getElementById("overlay-preview-frame");
export const overlayPreviewStage = document.getElementById("overlay-preview-stage");
export const overlayPreviewViewport = document.getElementById("overlay-preview-viewport");
export const overlayPreviewMode = document.getElementById("overlay-preview-mode");
export const overlayPreviewSize = document.getElementById("overlay-preview-size");
export const overlayPreviewWidth = document.getElementById("overlay-preview-width");
export const overlayPreviewHeight = document.getElementById("overlay-preview-height");
export const overlayPreviewBackground = document.getElementById("overlay-preview-background");
export const overlayPreviewReplay = document.getElementById("overlay-preview-replay");
export const overlayPreviewOpen = document.getElementById("overlay-preview-open");
export const overlayPreviewNote = document.getElementById("overlay-preview-note");
export const overlayChatFields = document.getElementById("overlay-chat-fields");
export const overlayLeaderboardFields = document.getElementById("overlay-leaderboard-fields");
export const overlayLeaderboardFontSize = document.getElementById("overlay-leaderboard-font-size");
export const overlayLeaderboardLayout = document.getElementById("overlay-leaderboard-layout");
export const overlayLeaderboardPeriod = document.getElementById("overlay-leaderboard-period");
export const overlayPreviewModeControl = document.getElementById("overlay-preview-mode-control");
export const obsSetupTab = document.getElementById("obs-setup-tab");
export const obsAppearanceTab = document.getElementById("obs-appearance-tab");
export const obsSetupPanel = document.getElementById("obs-setup-panel");
export const obsAppearancePanel = document.getElementById("obs-appearance-panel");
export const obsCopyStatus = document.getElementById("obs-copy-status");
export const obsOverlayOpen = document.getElementById("obs-overlay-open");
export const obsDockOpen = document.getElementById("obs-dock-open");
export const obsOverlayUrl = document.getElementById("obs-overlay-url");
export const obsLeaderboardUrl = document.getElementById("obs-leaderboard-url");
export const obsLeaderboardPeriod = document.getElementById("obs-leaderboard-period");
export const obsLeaderboardOpen = document.getElementById("obs-leaderboard-open");
export const presetIslandUrl = document.getElementById("preset-island-url");
export const presetUrlStatus = document.getElementById("preset-url-status");
export const presetIslandCount = document.getElementById("preset-island-count");
export const emotesTwitch = document.getElementById("emotes-twitch");
export const emotesYouTube = document.getElementById("emotes-youtube");
export const emotesVK = document.getElementById("emotes-vk");
export const emotesFFZ = document.getElementById("emotes-ffz");
export const emotesBTTV = document.getElementById("emotes-bttv");
export const emotesSevenTV = document.getElementById("emotes-7tv");
export const imagePreviewsEnabled = document.getElementById("image-previews-enabled");
export const imagePreviewsAllowedHosts = document.getElementById("image-previews-allowed-hosts");
export const imagePreviewsMaxWidth = document.getElementById("image-previews-max-width");
export const imagePreviewsMaxHeight = document.getElementById("image-previews-max-height");
export const imagePreviewsMaxPerMessage = document.getElementById("image-previews-max-per-message");
export const emoteCacheEntries = document.getElementById("emote-cache-entries");
export const emoteProviderList = document.getElementById("emote-provider-list");
export const recentMessages = document.getElementById("recent-messages");
export const recentMessagesEmpty = document.getElementById("recent-messages-empty");
export const refreshMessages = document.getElementById("refresh-messages");
export const refreshLeaderboard = document.getElementById("refresh-leaderboard");
export const refreshStatistics = document.getElementById("refresh-statistics");
export const refreshViewers = document.getElementById("refresh-viewers");
export const liveMessagesTab = document.getElementById("live-messages-tab");
export const liveLeaderboardTab = document.getElementById("live-leaderboard-tab");
export const liveStatisticsTab = document.getElementById("live-statistics-tab");
export const liveMessagesPanel = document.getElementById("live-messages-panel");
export const liveLeaderboardPanel = document.getElementById("live-leaderboard-panel");
export const liveStatisticsPanel = document.getElementById("live-statistics-panel");
export const liveLeaderboardRegion = document.getElementById("live-leaderboard-region");
export const liveLeaderboardPeriod = document.getElementById("live-leaderboard-period");
export const liveLeaderboardTableBody = document.getElementById("live-leaderboard-table-body");
export const liveLeaderboardEmpty = document.getElementById("live-leaderboard-empty");
export const liveLeaderboardError = document.getElementById("live-leaderboard-error");
export const liveStatisticsRegion = document.getElementById("live-statistics-region");
export const liveStatisticsList = document.getElementById("live-statistics-list");
export const liveStatisticsEmpty = document.getElementById("live-statistics-empty");
export const liveStatisticsPartial = document.getElementById("live-statistics-partial");
export const liveStatisticsError = document.getElementById("live-statistics-error");
export const liveActivePreset = document.getElementById("live-active-preset");
export const liveBrowserClients = document.getElementById("live-browser-clients");
export const liveTwitchStatus = document.getElementById("live-twitch-status");
export const liveYoutubeStatus = document.getElementById("live-youtube-status");
export const liveVkStatus = document.getElementById("live-vk-status");
export const audienceNewStreamButton = document.getElementById("audience-new-stream-button");
export const audiencePeriod = document.getElementById("audience-period");
export const audienceOpenLeaderboard = document.getElementById("audience-open-leaderboard");
export const audienceLayout = document.getElementById("audience-layout");
export const audienceTableRegion = document.getElementById("audience-table-region");
export const audienceViewersTableBody = document.getElementById("audience-viewers-table-body");
export const audienceTableEmpty = document.getElementById("audience-table-empty");
export const audienceTableEmptyMessage = document.getElementById("audience-table-empty-message");
export const audienceClearSearch = document.getElementById("audience-clear-search");
export const audienceTableError = document.getElementById("audience-table-error");
export const audienceInspector = document.getElementById("audience-inspector");
export const audienceInspectorBody = document.getElementById("audience-inspector-body");
export const audienceInspectorEmpty = document.getElementById("audience-inspector-empty");
export const audienceInspectorLoading = document.getElementById("audience-inspector-loading");
export const audienceInspectorClose = document.getElementById("audience-inspector-close");
export const audienceDetailSheet = document.getElementById("audience-detail-sheet");
export const audienceSheetBody = document.getElementById("audience-sheet-body");
export const audienceSheetLoading = document.getElementById("audience-sheet-loading");
export const audienceSheetClose = document.getElementById("audience-sheet-close");
export const viewersSearch = document.getElementById("viewers-search");
export const viewerMergePrompt = document.getElementById("viewer-merge-prompt");
export const viewerMergePromptMessage = document.getElementById("viewer-merge-prompt-message");
export const viewerMergePromptCancel = document.getElementById("viewer-merge-prompt-cancel");
export const viewerMergePromptConfirm = document.getElementById("viewer-merge-prompt-confirm");
export const newStreamButton = document.getElementById("new-stream-button");
export const newStreamPrompt = document.getElementById("new-stream-prompt");
export const newStreamPromptCancel = document.getElementById("new-stream-prompt-cancel");
export const newStreamPromptConfirm = document.getElementById("new-stream-prompt-confirm");
export const pointsPerMessageInput = document.getElementById("points-per-message");
export const dayResetHourInput = document.getElementById("day-reset-hour");
export const messageSoundEnabledInput = document.getElementById("message-sound-enabled");
export const messageSoundVolumeInput = document.getElementById("message-sound-volume");
export const messageSoundVolumeLabel = document.getElementById("message-sound-volume-label");
export const messageSoundTypeInput = document.getElementById("message-sound-type");
export const testMessageSound = document.getElementById("test-message-sound");
export const timeLocaleInput = document.getElementById("time-locale");
export const aboutVersion = document.getElementById("about-version");
export const aboutTelegram = document.getElementById("about-telegram");
export const aboutGitHub = document.getElementById("about-github");
export const aboutCopyVersion = document.getElementById("about-copy-version");
export const aboutFeedback = document.getElementById("about-feedback");
export const statusErrorPopover = document.getElementById("status-error-popover");


export const fieldErrors = {
    twitch_channel: document.getElementById("twitch-channel-error"),
    network_socks5_address: document.getElementById("network-socks5-address-error"),
    vk_channel: document.getElementById("vk-channel-error"),
    youtube_video_input: document.getElementById("youtube-video-input-error"),
    youtube_channel_handle: document.getElementById("youtube-channel-handle-error"),
    youtube_connection_mode: document.getElementById("youtube-channel-handle-error"),
    overlay_max_messages: document.getElementById("overlay-max-messages-error"),
    overlay_message_ttl_seconds: document.getElementById("overlay-message-ttl-error"),
    overlay_font_size_px: document.getElementById("overlay-font-size-error"),
    overlay_leaderboard_font_size_px: document.getElementById("overlay-leaderboard-font-size-error"),
    overlay_display_mode: document.getElementById("overlay-display-mode-error"),
    overlay_theme: document.getElementById("overlay-theme-error"),
    overlay_image_previews_allowed_hosts: document.getElementById("image-previews-allowed-hosts-error"),
    overlay_image_previews_max_width_px: document.getElementById("image-previews-max-width-error"),
    overlay_image_previews_max_height_px: document.getElementById("image-previews-max-height-error"),
    overlay_image_previews_max_per_message: document.getElementById("image-previews-max-per-message-error"),
    admin_message_sound_volume: document.getElementById("message-sound-volume-error"),
    admin_message_sound_sound: document.getElementById("message-sound-type-error"),
    admin_time_locale: document.getElementById("time-locale-error"),
    points_per_message: document.getElementById("points-per-message-error"),
    day_reset_hour: document.getElementById("day-reset-hour-error"),
  };

export const fieldInputs = {
    twitch_channel: twitchChannel,
    network_socks5_address: networkSocks5Address,
    vk_channel: vkChannel,
    youtube_video_input: youtubeVideoInput,
    youtube_channel_handle: youtubeChannelHandle,
    overlay_max_messages: overlayMaxMessages,
    overlay_message_ttl_seconds: overlayMessageTTL,
    overlay_font_size_px: overlayFontSize,
    overlay_leaderboard_font_size_px: overlayLeaderboardFontSize,
    overlay_display_mode: overlayDisplayMode,
    overlay_theme: overlayTheme,
    overlay_image_previews_allowed_hosts: imagePreviewsAllowedHosts,
    overlay_image_previews_max_width_px: imagePreviewsMaxWidth,
    overlay_image_previews_max_height_px: imagePreviewsMaxHeight,
    overlay_image_previews_max_per_message: imagePreviewsMaxPerMessage,
    admin_message_sound_volume: messageSoundVolumeInput,
    admin_message_sound_sound: messageSoundTypeInput,
    admin_time_locale: timeLocaleInput,
    points_per_message: pointsPerMessageInput,
    day_reset_hour: dayResetHourInput,
  };
