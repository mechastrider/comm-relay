export interface CatalogRecord {
  id: string;
  name?: string;
  points?: number;
  trigger?: string;
  aliases?: string[];
  action?: string;
  enabled?: boolean;
  cooldown_seconds?: number;
  award_id?: string;
  splash_template?: string;
  sound?: string;
  duration_ms?: number;
  image_asset?: string;
  sound_file?: string;
  image_fit?: string;
  image_size_pct?: number;
  sound_volume?: number;
  layout?: string;
}
export interface CatalogDraft {
  name: string;
  points: string;
  trigger: string;
  aliases: string;
  action: string;
  enabled: boolean;
  cooldown_seconds: string;
  award_id: string;
  splash_template: string;
  sound: string;
  duration_ms: string;
  image_asset: string;
  sound_file: string;
  image_fit: string;
  image_size_pct: string;
  sound_volume: string;
  layout: string;
}
