import type { Achievement, Level } from "./progression-model";
import type { VisualStatus } from "../../components/ViewerVisuals";
export interface Identity {
  platform: string;
  user_id: string;
  username: string;
  display_name: string;
}
export interface Viewer extends Record<string, unknown> {
  id: string;
  display_name: string;
  avatar_url?: string;
  custom_avatar?: string;
  platforms?: string[];
  identities?: Identity[];
  xp: number;
  message_count: number;
  session_xp: number;
  session_message_count: number;
  day_xp: number;
  day_message_count: number;
  session_count: number;
  current_level?: Level;
  visual_status?: VisualStatus;
  leaderboard_hidden?: boolean;
  greetings_disabled?: boolean;
  progression_alerts_disabled?: boolean;
  progression?: {
    current_level?: Level;
    next_level?: Level;
    achievements?: Array<{
      achievement: Achievement;
      value: number;
      occurrences: number;
    }>;
  };
}
