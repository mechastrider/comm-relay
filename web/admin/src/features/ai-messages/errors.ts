import type { AIJob } from "./types";
import type { Translate } from "../../app/locale";

const messages: Record<string, string> = {
  "Add at least one character before enabling.": "ai.error.charactersRequired",
  "Use HTTPS or an explicit loopback HTTP endpoint.": "ai.error.endpoint",
  "Timeout is outside the supported range.": "ai.error.timeout",
  "Enter an environment variable name, never a key value.": "ai.error.keyEnv",
  "Choose a model (maximum 200 characters).": "ai.error.model",
  "Choose json_schema or json_object.": "ai.error.outputMode",
  "Use mp3_44100_128 for this experiment.": "ai.error.outputFormat",
  "Value is outside the supported range.": "ai.error.range",
  "Context, denylist or character catalog is too large.": "ai.error.catalogSize",
  "Use nonempty phrases of at most 200 characters.": "ai.error.denylistValidation",
  "Each character needs a unique ID, label, voice and 1–50 described images.": "ai.error.character",
  "Choose a supported default delivery.": "ai.error.delivery",
  "Image IDs must be unique per character and reference a command.": "ai.error.image",
  "Check the highlighted fields.": "ai.error.validation",
  "AI messages unavailable": "ai.error.unavailable",
  "AI message changed, expired, or queue is full": "ai.error.conflict",
  "AI message not found": "ai.error.notFound",
  "AI messages disabled or paused": "ai.error.paused",
  "AI message operation failed": "ai.error.operation",
  "invalid AI message": "ai.error.invalid",
  "Connection unavailable": "ai.error.network"
};

const codes = new Set(["network_error", "provider_timeout", "model_refusal", "output_truncated", "incomplete_response", "invalid_json", "schema_mismatch", "invalid_envelope", "configuration", "missing_key", "network_or_timeout", "read_response", "response_too_large", "invalid_result", "canceled_or_timeout", "denylist", "catalog_changed", "audio_duration", "audio_storage", "review_full", "restart", "invalid_record", "storage_error", "settings_changed"]);

export function translateAIError(message: string, t: Translate): string {
  if (Object.hasOwn(messages, message)) return t(messages[message]);
  const missingKey = /^invalid AI message: missing credential environment variable (.+)$/.exec(message);
  if (missingKey) return t("ai.error.missingEnv", { name: missingKey[1] });
  if (/^invalid AI message: catalog (trigger|alias) m is reserved while enabled$/.test(message)) return t("ai.error.reservedTrigger");
  if (/^invalid AI message: (image command missing|select an enabled alert command with an existing image)$/.test(message)) return t("ai.error.imageCommand");
  const code = message.replace(/^AI provider: /, "");
  if (["authentication", "quota_exhausted", "rate_limited"].includes(code)) return t("ai.state." + code);
  if (codes.has(code)) return t("ai.error." + code);
  const http = /^http_(\d{3})$/.exec(code);
  if (http) return t("ai.error.providerHTTP", { status: http[1] });
  return t("ai.error.unknown", { detail: message });
}

export function describeFailure(job: AIJob, t: Translate): string {
  const reason = translateAIError(job.error_code ?? "", t);
  const details = job.failure;
  if (!details) return reason;
  const explanation = details.rule ? t("ai.rule." + details.rule) : reason;
  const field = details.field ? ` [${details.field}]` : "";
  const queue = t("ai.queue." + details.queue, { seconds: details.wait_seconds ?? 0 });
  return `${t("ai.state." + details.stage)} — ${explanation}${field} ${queue}`;
}
