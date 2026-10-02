export function readPreference(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
export function writePreference(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Private webviews may disable storage. */
  }
}
export async function copyText(value: string, input?: HTMLInputElement | null) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    if (!input) return false;
    const previous = document.activeElement;
    input.focus();
    input.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      /* Keep the selected URL for manual copy. */
    }
    if (copied && previous instanceof HTMLElement) previous.focus();
    return copied;
  }
}
