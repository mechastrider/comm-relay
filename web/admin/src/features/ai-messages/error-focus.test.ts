import { afterEach, expect, it, vi } from "vitest";
import { firstAIErrorTarget, focusAIError } from "./error-focus";

afterEach(() => {
  vi.restoreAllMocks();
});

function fixture() {
  const form = document.createElement("form");
  const summary = document.createElement("p");
  summary.tabIndex = -1;
  const fieldError = document.createElement("p");
  fieldError.dataset.aiError = "";
  fieldError.tabIndex = -1;
  form.append(fieldError);
  document.body.append(form, summary);
  return { form, summary, fieldError };
}

it("prefers an invalid control over inline errors and the summary", () => {
  const { form, summary, fieldError } = fixture();
  const input = document.createElement("input");
  input.setAttribute("aria-invalid", "true");
  form.prepend(input);

  expect(firstAIErrorTarget(form, summary)).toBe(input);
  expect(firstAIErrorTarget(form, summary)).not.toBe(fieldError);
  form.remove();
  summary.remove();
});

it("falls back to an inline error when no control is marked invalid", () => {
  const { form, summary, fieldError } = fixture();

  expect(firstAIErrorTarget(form, summary)).toBe(fieldError);
  form.remove();
  summary.remove();
});

it("falls back to the save-row summary when the form has no field errors", () => {
  const { form, summary } = fixture();
  form.textContent = "";

  expect(firstAIErrorTarget(form, summary)).toBe(summary);
  form.remove();
  summary.remove();
});

it("focuses the target and centers it in the scroll area", () => {
  const { form, summary } = fixture();
  const input = document.createElement("input");
  input.setAttribute("aria-invalid", "true");
  form.prepend(input);
  const focus = vi.spyOn(input, "focus");
  const scroll = vi.fn();
  input.scrollIntoView = scroll;

  focusAIError(firstAIErrorTarget(form, summary));

  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  expect(scroll).toHaveBeenCalledWith({ block: "center" });
  form.remove();
  summary.remove();
});
