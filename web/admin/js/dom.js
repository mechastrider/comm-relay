export const form = document.getElementById("settings-form");
export const appShell = document.getElementById("app-shell");
export const workspaceMain = document.getElementById("workspace-main");
export const shellAnnouncements = document.getElementById("shell-announcements");
export const shellDiagnosticsButton = document.getElementById("shell-diagnostics-button");
export const shellStatusBar = document.getElementById("shell-status-bar");
export const saveButtons = Array.from(document.querySelectorAll("[data-save-button]"));
export const settingsState = document.getElementById("settings-state");
export const footerSettingsState = document.getElementById("footer-settings-state");
export const banner = document.getElementById("banner");
export const twitchStatus = document.getElementById("twitch-status");
export const twitchDetail = document.getElementById("settings-twitch-detail");
export const twitchEnabled = document.getElementById("twitch-enabled");
export const twitchChannel = document.getElementById("twitch-channel");
export const networkSocks5Address = document.getElementById("network-socks5-address");
export const networkSocks5Username = document.getElementById("network-socks5-username");
export const networkSocks5Password = document.getElementById("network-socks5-password");
export const serverPortInput = document.getElementById("server-port");
export const youtubeUseProxy = document.getElementById("youtube-use-proxy");
export const vkUseProxy = document.getElementById("vk-use-proxy");
export const youtubeStatus = document.getElementById("youtube-status");
export const youtubeOAuthLabel = document.getElementById("settings-youtube-oauth-label");
export const youtubeDetail = document.getElementById("settings-youtube-detail");
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
export const vkDetail = document.getElementById("settings-vk-detail");
export const diagUptime = document.getElementById("diag-uptime");
export const diagWsClients = document.getElementById("diag-ws-clients");
export const diagMessageCounts = document.getElementById("diag-message-counts");
export const settingsDiagUptime = document.getElementById("settings-diag-uptime");
export const settingsDiagWsClients = document.getElementById("settings-diag-ws-clients");
export const settingsDiagMessageCounts = document.getElementById("settings-diag-message-counts");
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
export const overlayPreviewState = document.getElementById("overlay-preview-state");
export const overlayPreviewStateText = document.getElementById("overlay-preview-state-text");
export const overlayPreviewRetry = document.getElementById("overlay-preview-retry");
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
export const overlayPreviewOverflowToggle = document.getElementById("overlay-preview-overflow-toggle");
export const overlayPreviewOverflowPanel = document.getElementById("overlay-preview-overflow-panel");
export const overlayChatFields = document.getElementById("overlay-chat-fields");
export const overlayLeaderboardFields = document.getElementById("overlay-leaderboard-fields");
export const overlayLeaderboardFontSize = document.getElementById("overlay-leaderboard-font-size");
export const overlayLeaderboardSizingMode = document.getElementById("overlay-leaderboard-sizing-mode");
export const overlayLeaderboardFixedField = document.getElementById("overlay-leaderboard-fixed-field");
export const overlayLeaderboardTitleMode = document.getElementById("overlay-leaderboard-title-mode");
export const overlayLeaderboardCustomTitleField = document.getElementById("overlay-leaderboard-custom-title-field");
export const overlayLeaderboardTitle = document.getElementById("overlay-leaderboard-title");
export const overlayLeaderboardShowMessageCount = document.getElementById("overlay-leaderboard-show-message-count");
export const overlayLeaderboardMaxEntriesAll = document.getElementById("overlay-leaderboard-max-entries-all");
export const overlayLeaderboardLayout = document.getElementById("overlay-leaderboard-layout");
export const overlayLeaderboardPeriod = document.getElementById("overlay-leaderboard-period");
export const overlayThemePicker = document.getElementById("overlay-theme-picker");
export const overlayDurationChips = document.getElementById("overlay-duration-chips");
export const studioEssentialFontChat = document.getElementById("studio-essential-font-chat");
export const studioEssentialFontLeaderboard = document.getElementById("studio-essential-font-leaderboard");
export const studioEssentialLeaderboardTitle = document.getElementById("studio-essential-leaderboard-title");
export const studioEssentialLeaderboardMessages = document.getElementById("studio-essential-leaderboard-messages");
export const studioEssentialFontAlerts = document.getElementById("studio-essential-font-alerts");
export const studioEssentialDuration = document.getElementById("studio-essential-duration");
export const studioEssentialPeriod = document.getElementById("studio-essential-period");
export const studioEssentialAlertsImageSize = document.getElementById("studio-essential-alerts-image-size");
export const overlayAlertsImageSize = document.getElementById("overlay-alerts-image-size");
export const overlayAlertsFontSize = document.getElementById("overlay-alerts-font-size");
export const overlayAlertsImageSizeValue = document.getElementById("overlay-alerts-image-size-value");
export const overlayPreviewModeControl = document.getElementById("overlay-preview-mode-control");
export const obsSetupTab = document.getElementById("obs-setup-tab");
export const obsAppearanceTab = document.getElementById("obs-appearance-tab");
export const obsSetupPanel = document.getElementById("obs-setup-panel");
export const obsAppearancePanel = document.getElementById("obs-appearance-panel");
export const obsCopyStatus = document.getElementById("obs-copy-status");
export const obsOverlayOpen = document.getElementById("obs-overlay-open");
export const obsDockOpen = document.getElementById("obs-dock-open");
export const obsOverlayUrl = document.getElementById("obs-overlay-url");
export const obsOverlayUrlPinned = document.getElementById("obs-overlay-url-pinned");
export const obsOverlayPinnedLabel = document.getElementById("obs-overlay-pinned-label");
export const obsLeaderboardUrl = document.getElementById("obs-leaderboard-url");
export const obsLeaderboardUrlPinned = document.getElementById("obs-leaderboard-url-pinned");
export const obsLeaderboardPinnedLabel = document.getElementById("obs-leaderboard-pinned-label");
export const obsLeaderboardPeriod = document.getElementById("obs-leaderboard-period");
export const obsLeaderboardOpen = document.getElementById("obs-leaderboard-open");
export const obsAlertUrl = document.getElementById("obs-alert-url");
export const obsAlertUrlPinned = document.getElementById("obs-alert-url-pinned");
export const obsAlertPinnedLabel = document.getElementById("obs-alert-pinned-label");
export const obsAlertOpen = document.getElementById("obs-alert-open");
export const presetIslandUrl = document.getElementById("preset-island-url");
export const presetUrlStatus = document.getElementById("preset-url-status");
export const presetIslandCount = document.getElementById("preset-island-count");
export const presetIslandIconActions = document.getElementById("preset-island-icon-actions");
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
export const emoteCacheEntries = document.getElementById("settings-emote-cache-entries");
export const emoteProviderList = document.getElementById("settings-emote-provider-list");
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
export const studioWorkspace = document.getElementById("workspace-studio");
export const studioPublishButton = document.getElementById("studio-publish");
export const studioDirtyStatus = document.getElementById("studio-dirty-status");
export const studioUseOnStream = document.getElementById("studio-use-on-stream");
export const studioUseOnStreamHint = document.getElementById("studio-use-on-stream-hint");
export const studioCompactPublishButton = document.getElementById("studio-compact-publish");
export const studioCompactDirtyStatus = document.getElementById("studio-compact-dirty-status");
export const studioCompactUseOnStream = document.getElementById("studio-compact-use-on-stream");
export const studioCompactUseOnStreamHint = document.getElementById("studio-compact-use-on-stream-hint");
export const studioModeEssentials = document.getElementById("studio-mode-essentials");
export const studioModeAll = document.getElementById("studio-mode-all");
export const studioSurfaceCollapse = document.getElementById("studio-surface-collapse");
export const studioSetupReminder = document.getElementById("studio-setup-reminder");
export const studioEssentialAlertsNote = document.getElementById("studio-essential-alerts-note");
export const studioSelectedSurfaceHeading = document.getElementById("studio-selected-surface-heading");
export const studioFollowUrl = document.getElementById("studio-follow-url");
export const studioFollowUrlCompact = document.getElementById("studio-follow-url-compact");
export const studioPinnedUrl = document.getElementById("studio-pinned-url");
export const studioPinnedUrlLabel = document.getElementById("studio-pinned-url-label");
export const studioCopyStatus = document.getElementById("studio-copy-status");
export const overlayDebugToggle = document.getElementById("overlay-debug-toggle");
export const overlayDebugPanel = document.getElementById("overlay-debug-panel");
export const overlayDebugClose = document.getElementById("overlay-debug-close");
export const overlayDebugHeading = document.getElementById("overlay-debug-heading");
export const overlayDebugScenario = document.getElementById("overlay-debug-scenario");
export const overlayDebugRun = document.getElementById("overlay-debug-run");
export const overlayDebugReplay = document.getElementById("overlay-debug-replay");
export const overlayDebugReset = document.getElementById("overlay-debug-reset");
export const overlayDebugRetry = document.getElementById("overlay-debug-retry");
export const overlayDebugStatus = document.getElementById("overlay-debug-status");
export const overlayDebugStableURL = document.getElementById("overlay-debug-stable-url");
export const overlayDebugSnapshotURL = document.getElementById("overlay-debug-snapshot-url");
export const overlayDebugStableCopy = document.getElementById("overlay-debug-stable-copy");
export const overlayDebugSnapshotCopy = document.getElementById("overlay-debug-snapshot-copy");
export const studioDiscardDialog = document.getElementById("studio-discard-dialog");
export const studioDiscardCancel = document.getElementById("studio-discard-cancel");
export const studioDiscardConfirm = document.getElementById("studio-discard-confirm");
export const studioAddToObsDialog = document.getElementById("studio-add-to-obs-dialog");
export const studioAddToObsOpenButton = document.getElementById("studio-add-to-obs-open");
export const studioAddToObsFollowUrl = document.getElementById("studio-add-to-obs-follow-url");
export const studioAddToObsPinnedUrl = document.getElementById("studio-add-to-obs-pinned-url");
export const studioAddToObsPinnedLabel = document.getElementById("studio-add-to-obs-pinned-label");
export const studioAddToObsLeaderboardPeriod = document.getElementById("studio-add-to-obs-leaderboard-period");
export const studioAddToObsLeaderboardFollowUrl = document.getElementById("studio-add-to-obs-leaderboard-follow-url");
export const studioAddToObsLeaderboardPinnedUrl = document.getElementById("studio-add-to-obs-leaderboard-pinned-url");
export const studioAddToObsLeaderboardPinnedLabel = document.getElementById("studio-add-to-obs-leaderboard-pinned-label");
export const studioAddToObsAlertFollowUrl = document.getElementById("studio-add-to-obs-alert-follow-url");
export const studioAddToObsAlertPinnedUrl = document.getElementById("studio-add-to-obs-alert-pinned-url");
export const studioAddToObsAlertPinnedLabel = document.getElementById("studio-add-to-obs-alert-pinned-label");
export const studioAddToObsDockUrl = document.getElementById("studio-add-to-obs-dock-url");
export const studioAddToObsDockOpen = document.getElementById("studio-add-to-obs-dock-open");
export const studioAddToObsOverlayOpen = document.getElementById("studio-add-to-obs-overlay-open");
export const studioAddToObsLeaderboardOpen = document.getElementById("studio-add-to-obs-leaderboard-open");
export const studioAddToObsAlertOpen = document.getElementById("studio-add-to-obs-alert-open");
export const studioAddToObsCopyStatus = document.getElementById("studio-add-to-obs-copy-status");
export const studioAddToObsSourceTitle = document.getElementById("studio-add-to-obs-source-title");
export const studioAddToObsSourceSummary = document.getElementById("studio-add-to-obs-source-summary");
export const studioAddToObsSourceBadge = document.getElementById("studio-add-to-obs-source-badge");
export const studioAddToObsSourceEyebrow = document.getElementById("studio-add-to-obs-source-eyebrow");
export const liveBrowserClients = document.getElementById("live-browser-clients");
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
export const audienceViewersTab = document.getElementById("audience-viewers-tab");
export const audienceCommandsTab = document.getElementById("audience-commands-tab");
export const audienceAwardsTab = document.getElementById("audience-awards-tab");
export const audienceViewersPanel = document.getElementById("audience-viewers-panel");
export const audienceCommandsPanel = document.getElementById("audience-commands-panel");
export const audienceAwardsPanel = document.getElementById("audience-awards-panel");
export const commandsListRegion = document.getElementById("commands-list-region");
export const commandsList = document.getElementById("commands-list");
export const commandsListEmpty = document.getElementById("commands-list-empty");
export const commandsListError = document.getElementById("commands-list-error");
export const commandsCreateButton = document.getElementById("commands-create-button");
export const commandsEmptyCreate = document.getElementById("commands-empty-create");
export const commandsEditorForm = document.getElementById("commands-editor-form");
export const commandsEditorEmpty = document.getElementById("commands-editor-empty");
export const commandsSaveButton = document.getElementById("commands-save-button");
export const commandsDeleteButton = document.getElementById("commands-delete-button");
export const commandTriggerInput = document.getElementById("command-trigger-input");
export const commandTriggerError = document.getElementById("command-trigger-error");
export const commandEnabledInput = document.getElementById("command-enabled-input");
export const commandCooldownInput = document.getElementById("command-cooldown-input");
export const commandSplashInput = document.getElementById("command-splash-input");
export const commandSplashVars = document.getElementById("command-splash-vars");
export const commandSplashPreview = document.getElementById("command-splash-preview");
export const commandSplashError = document.getElementById("command-splash-error");
export const commandSoundInput = document.getElementById("command-sound-input");
export const commandImagePreview = document.getElementById("command-image-preview");
export const commandImageInput = document.getElementById("command-image-input");
export const commandImageClear = document.getElementById("command-image-clear");
export const commandImageError = document.getElementById("command-image-error");
export const commandImageFitInput = document.getElementById("command-image-fit-input");
export const commandImageFitError = document.getElementById("command-image-fit-error");
export const commandImageSizeInput = document.getElementById("command-image-size-input");
export const commandImageSizeValue = document.getElementById("command-image-size-value");
export const commandImageSizeError = document.getElementById("command-image-size-error");
export const commandSoundFileInput = document.getElementById("command-sound-file-input");
export const commandSoundFileClear = document.getElementById("command-sound-file-clear");
export const commandSoundFileError = document.getElementById("command-sound-file-error");
export const commandSoundVolumeInput = document.getElementById("command-sound-volume-input");
export const commandSoundVolumeValue = document.getElementById("command-sound-volume-value");
export const commandSoundVolumeError = document.getElementById("command-sound-volume-error");
export const commandSoundPlay = document.getElementById("command-sound-play");
export const commandSoundStop = document.getElementById("command-sound-stop");
export const commandLayoutError = document.getElementById("command-layout-error");
export const commandDurationInput = document.getElementById("command-duration-input");
export const awardsListRegion = document.getElementById("awards-list-region");
export const awardsList = document.getElementById("awards-list");
export const awardsListEmpty = document.getElementById("awards-list-empty");
export const awardsListError = document.getElementById("awards-list-error");
export const awardsCreateButton = document.getElementById("awards-create-button");
export const awardsEmptyCreate = document.getElementById("awards-empty-create");
export const awardsEditorForm = document.getElementById("awards-editor-form");
export const awardsEditorEmpty = document.getElementById("awards-editor-empty");
export const awardsSaveButton = document.getElementById("awards-save-button");
export const awardsDeleteButton = document.getElementById("awards-delete-button");
export const awardNameInput = document.getElementById("award-name-input");
export const awardNameError = document.getElementById("award-name-error");
export const awardPointsInput = document.getElementById("award-points-input");
export const awardPointsError = document.getElementById("award-points-error");
export const awardSplashInput = document.getElementById("award-splash-input");
export const awardSplashVars = document.getElementById("award-splash-vars");
export const awardSplashPreview = document.getElementById("award-splash-preview");
export const awardSplashError = document.getElementById("award-splash-error");
export const awardSoundInput = document.getElementById("award-sound-input");
export const awardImagePreview = document.getElementById("award-image-preview");
export const awardImageInput = document.getElementById("award-image-input");
export const awardImageClear = document.getElementById("award-image-clear");
export const awardImageError = document.getElementById("award-image-error");
export const awardImageFitInput = document.getElementById("award-image-fit-input");
export const awardImageFitError = document.getElementById("award-image-fit-error");
export const awardImageSizeInput = document.getElementById("award-image-size-input");
export const awardImageSizeValue = document.getElementById("award-image-size-value");
export const awardImageSizeError = document.getElementById("award-image-size-error");
export const awardSoundFileInput = document.getElementById("award-sound-file-input");
export const awardSoundFileClear = document.getElementById("award-sound-file-clear");
export const awardSoundFileError = document.getElementById("award-sound-file-error");
export const awardSoundVolumeInput = document.getElementById("award-sound-volume-input");
export const awardSoundVolumeValue = document.getElementById("award-sound-volume-value");
export const awardSoundVolumeError = document.getElementById("award-sound-volume-error");
export const awardSoundPlay = document.getElementById("award-sound-play");
export const awardSoundStop = document.getElementById("award-sound-stop");
export const awardLayoutError = document.getElementById("award-layout-error");
export const awardDurationInput = document.getElementById("award-duration-input");
export const catalogDeletePrompt = document.getElementById("catalog-delete-prompt");
export const catalogDeletePromptMessage = document.getElementById("catalog-delete-prompt-message");
export const catalogDeletePromptCancel = document.getElementById("catalog-delete-prompt-cancel");
export const catalogDeletePromptConfirm = document.getElementById("catalog-delete-prompt-confirm");
export const viewersSearch = document.getElementById("viewers-search");
export const viewerMergePrompt = document.getElementById("viewer-merge-prompt");
export const viewerMergePromptMessage = document.getElementById("viewer-merge-prompt-message");
export const viewerMergePromptCancel = document.getElementById("viewer-merge-prompt-cancel");
export const viewerMergePromptConfirm = document.getElementById("viewer-merge-prompt-confirm");
export const newStreamButton = document.getElementById("new-stream-button");
export const newStreamPrompt = document.getElementById("new-stream-prompt");
export const newStreamPromptCancel = document.getElementById("new-stream-prompt-cancel");
export const newStreamPromptConfirm = document.getElementById("new-stream-prompt-confirm");
export const activityIntervalSecondsInput = document.getElementById("activity-interval-seconds");
export const activitySessionLimitInput = document.getElementById("activity-session-limit");
export const activityXPInput = document.getElementById("activity-xp");
export const hideCommandMessagesInput = document.getElementById("hide-command-messages");
export const customAvatarsEnabledInput = document.getElementById("custom-avatars-enabled");
export const streamerDisplayNameInput = document.getElementById("streamer-display-name");
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
    server_port: document.getElementById("server-port-error"),
    vk_channel: document.getElementById("vk-channel-error"),
    youtube_video_input: document.getElementById("youtube-video-input-error"),
    youtube_channel_handle: document.getElementById("youtube-channel-handle-error"),
    youtube_connection_mode: document.getElementById("youtube-channel-handle-error"),
    overlay_max_messages: document.getElementById("overlay-max-messages-error"),
    overlay_message_ttl_seconds: document.getElementById("overlay-message-ttl-error"),
    overlay_font_size_px: document.getElementById("overlay-font-size-error"),
    overlay_leaderboard_font_size_px: document.getElementById("overlay-leaderboard-font-size-error"),
    overlay_leaderboard_sizing_mode: document.getElementById("overlay-leaderboard-sizing-mode-error"),
    overlay_leaderboard_title_mode: document.getElementById("overlay-leaderboard-title-mode-error"),
    overlay_leaderboard_title: document.getElementById("overlay-leaderboard-title-error"),
    overlay_leaderboard_max_entries: document.getElementById("overlay-leaderboard-max-entries-error"),
    overlay_alerts_font_size_px: document.getElementById("overlay-alerts-font-size-error"),
    overlay_alerts_image_size_pct: document.getElementById("overlay-alerts-image-size-error"),
    overlay_panel_opacity: document.getElementById("overlay-panel-opacity-error"),
    overlay_display_mode: document.getElementById("overlay-display-mode-error"),
    overlay_theme: document.getElementById("overlay-theme-error"),
    overlay_image_previews_allowed_hosts: document.getElementById("image-previews-allowed-hosts-error"),
    overlay_image_previews_max_width_px: document.getElementById("image-previews-max-width-error"),
    overlay_image_previews_max_height_px: document.getElementById("image-previews-max-height-error"),
    overlay_image_previews_max_per_message: document.getElementById("image-previews-max-per-message-error"),
    admin_message_sound_volume: document.getElementById("message-sound-volume-error"),
    admin_message_sound_sound: document.getElementById("message-sound-type-error"),
    admin_time_locale: document.getElementById("time-locale-error"),
    activity_interval_seconds: document.getElementById("activity-interval-seconds-error"),
    activity_session_limit: document.getElementById("activity-session-limit-error"),
    activity_xp: document.getElementById("activity-xp-error"),
    day_reset_hour: document.getElementById("day-reset-hour-error"),
    streamer_display_name: document.getElementById("streamer-display-name-error"),
  };

export const fieldInputs = {
    twitch_channel: twitchChannel,
    network_socks5_address: networkSocks5Address,
    server_port: serverPortInput,
    vk_channel: vkChannel,
    youtube_video_input: youtubeVideoInput,
    youtube_channel_handle: youtubeChannelHandle,
    overlay_max_messages: overlayMaxMessages,
    overlay_message_ttl_seconds: overlayMessageTTL,
    overlay_font_size_px: overlayFontSize,
    overlay_leaderboard_font_size_px: overlayLeaderboardFontSize,
    overlay_leaderboard_sizing_mode: overlayLeaderboardSizingMode,
    overlay_leaderboard_title_mode: overlayLeaderboardTitleMode,
    overlay_leaderboard_title: overlayLeaderboardTitle,
    overlay_leaderboard_max_entries: overlayLeaderboardMaxEntriesAll,
    overlay_alerts_font_size_px: overlayAlertsFontSize,
    overlay_alerts_image_size_pct: overlayAlertsImageSize,
    overlay_panel_opacity: document.getElementById("overlay-panel-opacity"),
    overlay_display_mode: overlayDisplayMode,
    overlay_theme: overlayTheme,
    overlay_image_previews_allowed_hosts: imagePreviewsAllowedHosts,
    overlay_image_previews_max_width_px: imagePreviewsMaxWidth,
    overlay_image_previews_max_height_px: imagePreviewsMaxHeight,
    overlay_image_previews_max_per_message: imagePreviewsMaxPerMessage,
    admin_message_sound_volume: messageSoundVolumeInput,
    admin_message_sound_sound: messageSoundTypeInput,
    admin_time_locale: timeLocaleInput,
    activity_interval_seconds: activityIntervalSecondsInput,
    activity_session_limit: activitySessionLimitInput,
    activity_xp: activityXPInput,
    day_reset_hour: dayResetHourInput,
    streamer_display_name: streamerDisplayNameInput,
  };
