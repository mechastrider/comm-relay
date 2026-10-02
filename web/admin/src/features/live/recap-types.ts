export interface RecapTotals {
  viewer_count: number;
  message_count: number;
  xp: number;
}
export interface RecapRanking {
  rank: number;
  display_name: string;
  portrait_url?: string;
  title?: string;
  xp: number;
  message_count: number;
}
export interface RecapAchievement {
  viewer_display_name: string;
  viewer_portrait_url?: string;
  achievement_id: string;
  name: string;
  description?: string;
  count: number;
}
export interface RecapPresentation {
  totals: RecapTotals;
  ranking: RecapRanking[];
  achievement_groups?: RecapAchievement[];
  captured_at?: string;
  generated_at?: string;
  session_id?: string;
}
export interface SessionSummary {
  id: string;
  started_at: string;
  is_current: boolean;
  has_recap: boolean;
  totals: RecapTotals;
}
export interface SessionDetail extends SessionSummary {
  ranking: RecapRanking[];
  achievement_groups: RecapAchievement[];
  snapshot?: RecapPresentation | null;
}
export interface RecapCurrent {
  session_id: string;
  session: SessionDetail;
  visible: boolean;
  window: "session" | "all" | null;
  snapshot: RecapPresentation | null;
  all_time: RecapPresentation | null;
}
