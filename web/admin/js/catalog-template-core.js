/** @type {Readonly<Record<string, string>>} */
export const SPLASH_VARIABLE_TOOLTIP_I18N = Object.freeze({
  "{viewer}": "catalog.variableViewer",
  "{streamer}": "catalog.variableStreamer",
  "{points}": "catalog.variablePoints",
  "{message}": "catalog.variableMessage",
});

/** @type {readonly string[]} */
export const SPLASH_VARIABLES = Object.freeze([
  "{viewer}",
  "{streamer}",
  "{points}",
  "{message}",
]);

/**
 * @param {string} template
 * @param {{ viewer?: string, streamer?: string, points?: number, message?: string }} vars
 * @returns {string}
 */
export function substituteSplashTemplate(template, vars) {
  const viewer = String(vars.viewer || "");
  const streamer = String(vars.streamer || "");
  const points = String(vars.points ?? 0);
  const message = String(vars.message || "");
  let text = String(template || "");
  text = text.split("{viewer}").join(viewer);
  text = text.split("{streamer}").join(streamer);
  text = text.split("{points}").join(points);
  text = text.split("{message}").join(message);
  return text;
}

/**
 * @param {HTMLInputElement} input
 * @param {string} token
 */
export function insertSplashVariable(input, token) {
  const value = input.value;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  if (typeof start === "number" && typeof end === "number") {
    input.value = value.slice(0, start) + token + value.slice(end);
    const caret = start + token.length;
    input.setSelectionRange(caret, caret);
    return;
  }
  input.value = value + token;
}
