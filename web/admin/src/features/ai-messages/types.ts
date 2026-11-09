export interface AIProvider {
  preset: string;
  base_url: string;
  model: string;
  api_key_env: string;
  output_mode: string;
  output_format: string;
  timeout_seconds: number;
}
export interface AIImage {
  id: string;
  command_id: string;
  description: string;
}
export interface AICharacter {
  id: string;
  label: string;
  description: string;
  voice_id: string;
  default_delivery: string;
  images: AIImage[];
}
export interface AISettings {
  llm: AIProvider;
  tts: AIProvider;
  stream_context: string;
  denylist: string[];
  limits: Record<string, number>;
  characters: AICharacter[];
}
export interface AIJob {
  id: string;
  revision: number;
  state: string;
  name: string;
  original_text: string;
  reason?: string;
  error_code?: string;
  created_at: string;
  expires_at: string;
  review_expires_at?: string;
  usage: unknown[] | null;
  stage_timings: Record<string, number>;
  prepared?: {
    display_text: string;
    segments: { text: string; delivery: string }[];
    character_id: string;
    image_id: string;
  };
  presentation: { image_asset: string };
}
export interface AIPage {
  items: AIJob[];
  next_cursor?: string;
  service_state: string;
  credentials: Record<string, boolean>;
}
export const deliveries = [
  "neutral",
  "warm",
  "excited",
  "dry",
  "urgent",
  "whisper",
];
export const presets: Record<string, { url: string; key: string }> = {
  openai: { url: "https://api.openai.com/v1", key: "OPENAI_API_KEY" },
  openrouter: {
    url: "https://openrouter.ai/api/v1",
    key: "OPENROUTER_API_KEY",
  },
  routerai: { url: "https://routerai.ru/api/v1", key: "ROUTERAI_API_KEY" },
  polza: { url: "https://polza.ai/api/v1", key: "POLZA_API_KEY" },
};
