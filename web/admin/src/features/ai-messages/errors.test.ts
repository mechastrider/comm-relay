import { describe, expect, it } from "vitest";
import { translate } from "../../app/locale";
import { translateAIError } from "./errors";

const ru = (key: string, values?: Record<string, string | number>) => translate("ru-RU", key, values);

describe("AI error messages", () => {
  it("explains the empty catalog in both interface languages", () => {
    const message = "Add at least one character before enabling.";
    expect(translateAIError(message, ru)).toBe("Добавьте хотя бы одного персонажа, прежде чем включать AI-сообщения.");
    expect(translateAIError(message, (key, values) => translate("en-GB", key, values))).toBe(message);
  });
  it("translates provider errors and retains diagnostic HTTP status", () => {
    expect(translateAIError("AI provider: missing_key", ru)).toContain("Ключ API провайдера не найден");
    expect(translateAIError("http_429", ru)).toContain("HTTP 429");
    expect(translateAIError("AI provider: http_401", ru)).toContain("HTTP 401");
    expect(translateAIError("invalid AI message: missing credential environment variable OPENAI_API_KEY", ru)).toContain("Переменная окружения OPENAI_API_KEY");
  });
  it("keeps unknown diagnostics without mistaking them for known errors", () => {
    expect(translateAIError("future_error", ru)).toBe("Ошибка AI: future_error");
    expect(translateAIError("constructor", ru)).toBe("Ошибка AI: constructor");
    expect(translateAIError("Use nonempty phrases of at most 200 characters.", ru)).toContain("200 символов");
    expect(translateAIError("denylist", ru)).toBe("Сообщение содержит запрещённую фразу.");
  });
});
