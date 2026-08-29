/**
 * Shared shell state class helpers for loading, stale, empty, error, busy, dirty, success, failure.
 */

/**
 * @param {Element | null} root
 * @param {"loading"|"stale"|"empty"|"error"|"busy"|"dirty"|"success"|"failure"|null} state
 */
export function setRegionState(root, state) {
  if (!root) {
    return;
  }
  const states = ["loading", "stale", "empty", "error", "busy", "dirty", "success", "failure"];
  states.forEach(function (name) {
    root.classList.toggle("state-" + name, state === name);
  });
  if (state) {
    root.setAttribute("data-state", state);
  } else {
    root.removeAttribute("data-state");
  }
}

/**
 * @param {HTMLElement | null} region
 * @param {string} message
 */
export function announceShell(region, message) {
  if (!region || message === "") {
    return;
  }
  region.textContent = "";
  window.requestAnimationFrame(function () {
    region.textContent = message;
  });
}
