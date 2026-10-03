import type { JsonObject } from "./api";

export interface PublicConfig {
  server_port: number;
  activity_interval_seconds: number;
  activity_session_limit: number;
  activity_xp: number;
  day_reset_hour: number;
  hide_command_messages: boolean;
  hide_command_cooldown_overlay: boolean;
  buffs_per_award_per_viewer: number;
  buff_max_unique_viewers: number;
  custom_avatars_enabled: boolean;
  streamer_display_name: string;
  leaderboard_visibility: {
    policy: string;
    display_seconds: number;
    cooldown_seconds: number;
    dirty_interval_seconds: number;
    show_on_award: boolean;
    show_on_rank_change: boolean;
  };
  twitch: { enabled: boolean; channel: string };
  youtube: {
    enabled: boolean;
    connection_mode: string;
    video_input: string;
    channel_handle: string;
    chat_mode: string;
    use_proxy: boolean;
    oauth: {
      client_id: string;
      has_client_secret?: boolean;
      connected?: boolean;
    };
  };
  vk: { enabled: boolean; channel: string; use_proxy: boolean };
  network: {
    socks5: { address: string; username: string; has_password?: boolean };
  };
  admin: {
    command_sound_enabled?: boolean;
    time_locale: string;
    message_sound: { enabled: boolean; sound: string; volume: number };
  };
  overlay: JsonObject;
  logging: JsonObject;
}
export interface ConnectorStatus {
  enabled: boolean;
  connected: boolean;
  status?: string;
  error?: string;
  last_error?: string;
  [key: string]: unknown;
}
export interface Diagnostics {
  app_version: string;
  uptime_seconds: number;
  websocket_clients: number;
  enabled_connectors: string[];
  message_counts: Record<string, number>;
  pipeline: Record<string, unknown>;
  connectors: Record<string, ConnectorStatus>;
  emote_cache: Record<string, unknown>;
}
