/**
 * Splash template variable substitution for catalog editor previews.
 */

import { t } from "./i18n-ui.js";
import { state } from "./state.js";
import {
  SPLASH_VARIABLES,
  SPLASH_VARIABLE_TOOLTIP_I18N,
  substituteSplashTemplate,
  insertSplashVariable,
} from "./catalog-template-core.js";

export { SPLASH_VARIABLES, SPLASH_VARIABLE_TOOLTIP_I18N, substituteSplashTemplate, insertSplashVariable };

/**
 * @returns {string}
 */
export function currentStreamerDisplayName() {
  const config = state.currentConfig;
  if (!config || typeof config.streamer_display_name !== "string") {
    return "";
  }
  return config.streamer_display_name.trim();
}

/**
 * @returns {string}
 */
export function previewStreamerName() {
  const configured = currentStreamerDisplayName();
  if (configured) {
    return configured;
  }
  return t("catalog.sampleStreamer");
}

/**
 * @param {HTMLElement | null} container
 * @param {HTMLInputElement | null} input
 * @param {() => void} onChange
 */
export function bindSplashVariableChips(container, input, onChange) {
  if (!container || !input) {
    return;
  }
  container.textContent = "";
  SPLASH_VARIABLES.forEach(function (token) {
    const tooltipKey = SPLASH_VARIABLE_TOOLTIP_I18N[token];
    const hint = tooltipKey ? t(tooltipKey) : "";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "catalog-template-chip has-tooltip";
    button.textContent = token;
    const ariaLabel = t("catalog.insertVariable", { variable: token });
    button.setAttribute("aria-label", hint ? `${ariaLabel}. ${hint}` : ariaLabel);
    if (hint) {
      const tooltip = document.createElement("span");
      tooltip.className = "ui-tooltip";
      tooltip.setAttribute("role", "tooltip");
      tooltip.textContent = hint;
      button.appendChild(tooltip);
    }
    button.addEventListener("click", function () {
      insertSplashVariable(input, token);
      onChange();
      input.focus();
    });
    container.appendChild(button);
  });
}

/**
 * @param {HTMLElement | null} previewEl
 * @param {string} template
 * @param {{ viewer?: string, streamer?: string, points?: number, message?: string }} vars
 */
export function renderSplashPreview(previewEl, template, vars) {
  if (!previewEl) {
    return;
  }
  previewEl.textContent = substituteSplashTemplate(template, vars);
}
