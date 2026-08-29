/** @typedef {"viewers"|"commands"|"awards"} AudienceTabId */

/** @type {readonly AudienceTabId[]} */
export const AUDIENCE_TABS = Object.freeze(["viewers", "commands", "awards"]);

let focusTabAfterHashChange = null;

/**
 * @param {AudienceTabId} current
 * @param {string} key
 * @returns {AudienceTabId}
 */
export function nextAudienceTab(current, key) {
  const currentIndex = Math.max(0, AUDIENCE_TABS.indexOf(current));
  if (key === "Home") {
    return AUDIENCE_TABS[0];
  }
  if (key === "End") {
    return AUDIENCE_TABS[AUDIENCE_TABS.length - 1];
  }
  if (key === "ArrowRight") {
    return AUDIENCE_TABS[(currentIndex + 1) % AUDIENCE_TABS.length];
  }
  if (key === "ArrowLeft") {
    return AUDIENCE_TABS[(currentIndex - 1 + AUDIENCE_TABS.length) % AUDIENCE_TABS.length];
  }
  return current;
}

/**
 * @param {string | null | undefined} hash
 * @returns {AudienceTabId}
 */
export function parseAudienceHash(hash) {
  if (!hash || hash === "#" || hash === "") {
    return "viewers";
  }
  const raw = hash.charAt(0) === "#" ? hash.slice(1) : hash;
  const parts = raw.toLowerCase().split("/");
  if (parts[0] !== "audience") {
    return "viewers";
  }
  const tab = parts[1] || "viewers";
  if (AUDIENCE_TABS.includes(/** @type {AudienceTabId} */ (tab))) {
    return /** @type {AudienceTabId} */ (tab);
  }

  return "viewers";
}

/**
 * @param {AudienceTabId} tab
 * @returns {string}
 */
export function audienceHash(tab) {
  if (tab === "viewers") {
    return "#audience";
  }

  return "#audience/" + tab;
}

/**
 * @param {AudienceTabId} tab
 * @param {{ focusTab?: boolean, onTabChange?: (tab: AudienceTabId) => void }} [options]
 */
export function setAudienceTab(tab, options) {
  const next = AUDIENCE_TABS.includes(tab) ? tab : "viewers";
  const panels = [
    { id: "viewers", tab: document.getElementById("audience-viewers-tab"), panel: document.getElementById("audience-viewers-panel") },
    { id: "commands", tab: document.getElementById("audience-commands-tab"), panel: document.getElementById("audience-commands-panel") },
    { id: "awards", tab: document.getElementById("audience-awards-tab"), panel: document.getElementById("audience-awards-panel") },
  ];

  panels.forEach(function (item) {
    if (!item.tab || !item.panel) {
      return;
    }
    const selected = item.id === next;
    item.tab.setAttribute("aria-selected", selected ? "true" : "false");
    item.tab.tabIndex = selected ? 0 : -1;
    item.panel.hidden = !selected;
  });

  if (options && typeof options.onTabChange === "function") {
    options.onTabChange(next);
  }

  if (options && options.focusTab) {
    const active = panels.find(function (item) {
      return item.id === next;
    });
    if (active && active.tab) {
      active.tab.focus();
    }
  }
}

/**
 * @param {{ onTabChange?: (tab: AudienceTabId) => void }} [options]
 */
export function initAudienceTabs(options) {
  const tabs = document.querySelectorAll("[data-audience-tab]");
  tabs.forEach(function (button) {
    button.addEventListener("click", function () {
      const tab = button.getAttribute("data-audience-tab");
      if (!tab || AUDIENCE_TABS.indexOf(/** @type {AudienceTabId} */ (tab)) === -1) {
        return;
      }
      const next = /** @type {AudienceTabId} */ (tab);
      const hash = audienceHash(next);
      if (window.location.hash !== hash) {
        window.location.hash = hash;
      } else {
        setAudienceTab(next, options);
      }
    });
    button.addEventListener("keydown", function (event) {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(event.key) === -1) {
        return;
      }
      event.preventDefault();
      const current = /** @type {AudienceTabId} */ (
        button.getAttribute("data-audience-tab") || "viewers"
      );
      const next = nextAudienceTab(current, event.key);
      const hash = audienceHash(next);
      if (window.location.hash !== hash) {
        focusTabAfterHashChange = next;
        window.location.hash = hash;
      } else {
        setAudienceTab(next, Object.assign({}, options, { focusTab: true }));
      }
    });
  });

  window.addEventListener("hashchange", function () {
    const next = parseAudienceHash(window.location.hash);
    const shouldFocus = focusTabAfterHashChange === next;
    focusTabAfterHashChange = null;
    setAudienceTab(next, Object.assign({}, options, { focusTab: shouldFocus }));
  });

  setAudienceTab(parseAudienceHash(window.location.hash), options);
}
