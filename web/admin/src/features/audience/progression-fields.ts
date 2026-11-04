import type { Values } from "./progression-model";
export interface ProgressionFieldProps {
  values: Values;
  errors: Record<string, string>;
  busy: boolean;
  change: (id: string, value: string | boolean) => void;
}
