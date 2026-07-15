export const MESSAGE_SOUND_TYPES = ["chime", "ping", "soft", "alert"];
export const RECENT_MESSAGE_LIMIT = 20;
export const MESSAGE_SCROLL_THRESHOLD_PX = 48;
export const BANNER_SUCCESS_DISMISS_MS = 4000;
export const OVERLAY_FONT_SIZE_MIN = 12;
export const OVERLAY_FONT_SIZE_MAX = 48;
export const OVERLAY_THEMES = ["default", "dashboard", "cockpit_panel", "cockpit_popups"];
export const INITIAL_WS_RECONNECT_MS = 1000;
export const MAX_WS_RECONNECT_MS = 30000;
export const SIDEBAR_COLLAPSED_KEY = "commRelay.sidebarCollapsed";
export const OVERLAY_PREVIEW_MODE_KEY = "commRelay.overlayPreview.mode";
export const OVERLAY_PREVIEW_BACKGROUND_KEY = "commRelay.overlayPreview.background";
export const OVERLAY_PREVIEW_WIDTH_KEY = "commRelay.overlayPreview.width";
export const OVERLAY_PREVIEW_HEIGHT_KEY = "commRelay.overlayPreview.height";
export const OVERLAY_PREVIEW_REFRESH_MS = 120;
export const OVERLAY_PREVIEW_DEFAULT_WIDTH = 640;
export const OVERLAY_PREVIEW_DEFAULT_HEIGHT = 360;
export const OVERLAY_PREVIEW_WIDTH_MIN = 240;
export const OVERLAY_PREVIEW_WIDTH_MAX = 3840;
export const OVERLAY_PREVIEW_HEIGHT_MIN = 180;
export const OVERLAY_PREVIEW_HEIGHT_MAX = 2160;
export const OVERLAY_PREVIEW_SIZES = {
    "640x360": [640, 360],
    "800x600": [800, 600],
    "1280x720": [1280, 720],
    "480x720": [480, 720],
  };

export const PROVIDER_LABELS = {
    twitch: "Twitch",
    ffz: "FFZ",
    bttv: "BTTV",
    "7tv": "7TV",
  };
