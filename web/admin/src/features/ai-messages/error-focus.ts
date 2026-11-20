/**
 * Picks the first problem worth showing after a failed save: an invalid
 * control, then an inline field error, then the save-row summary.
 */
export function firstAIErrorTarget(
  form: ParentNode | null,
  summary: HTMLElement | null,
): HTMLElement | null {
  return (
    form?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
    form?.querySelector<HTMLElement>("[data-ai-error]") ??
    summary
  );
}

/** Moves focus and centers the chosen error inside the settings scroll area. */
export function focusAIError(target: HTMLElement | null) {
  if (!target) return;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: "center" });
}
