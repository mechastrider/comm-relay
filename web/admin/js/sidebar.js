export const SIDEBAR_STORAGE_KEY = "commRelay.sidebarState";
export const SIDEBAR_EXPANDED = "expanded";
export const SIDEBAR_COLLAPSED = "collapsed";

export function normalizeSidebarState(raw) {
  return raw === SIDEBAR_COLLAPSED ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;
}

export function nextSidebarState(current) {
  return normalizeSidebarState(current) === SIDEBAR_COLLAPSED
    ? SIDEBAR_EXPANDED
    : SIDEBAR_COLLAPSED;
}

export function readSidebarState(storage) {
  try {
    if (!storage || typeof storage.getItem !== "function") {
      return SIDEBAR_EXPANDED;
    }
    return normalizeSidebarState(storage.getItem(SIDEBAR_STORAGE_KEY));
  } catch {
    return SIDEBAR_EXPANDED;
  }
}

export function writeSidebarState(storage, state) {
  try {
    if (!storage || typeof storage.setItem !== "function") {
      return false;
    }
    storage.setItem(SIDEBAR_STORAGE_KEY, normalizeSidebarState(state));
    return true;
  } catch {
    return false;
  }
}

function storageForDocument(doc) {
  try {
    return doc.defaultView ? doc.defaultView.localStorage : null;
  } catch {
    return null;
  }
}

function translationKey(state) {
  return state === SIDEBAR_COLLAPSED
    ? "shell.expandSidebar"
    : "shell.collapseSidebar";
}

export function applySidebarState(doc, translate, rawState) {
  const state = normalizeSidebarState(rawState);
  const nav = doc.getElementById("side-primary-navigation");
  const toggle = doc.getElementById("sidebar-toggle");
  if (!nav || !toggle) {
    return state;
  }

  const key = translationKey(state);
  const label = toggle.querySelector("[data-sidebar-toggle-label]");
  const tooltip = toggle.querySelector("[data-sidebar-toggle-tooltip]");
  const translated = translate(key);

  doc.documentElement.dataset.sidebarState = state;
  nav.dataset.sidebarState = state;
  toggle.setAttribute("aria-expanded", String(state === SIDEBAR_EXPANDED));
  toggle.setAttribute("aria-label", translated);
  toggle.setAttribute("data-i18n-aria-label", key);

  if (label) {
    label.setAttribute("data-i18n", key);
    label.textContent = translated;
  }
  if (tooltip) {
    tooltip.setAttribute("data-i18n", key);
    tooltip.textContent = translated;
  }

  return state;
}

export function initSidebar(doc, translate, options) {
  const toggle = doc.getElementById("sidebar-toggle");
  if (!toggle) {
    return null;
  }

  const storage = options && Object.prototype.hasOwnProperty.call(options, "storage")
    ? options.storage
    : storageForDocument(doc);
  let state = applySidebarState(doc, translate, readSidebarState(storage));

  function render() {
    state = applySidebarState(doc, translate, state);
  }

  function handleToggle() {
    state = nextSidebarState(state);
    applySidebarState(doc, translate, state);
    writeSidebarState(storage, state);
  }

  toggle.addEventListener("click", handleToggle);
  if (doc.defaultView) {
    doc.defaultView.addEventListener("admin-locale-applied", render);
  }

  return {
    getState: function () {
      return state;
    },
    destroy: function () {
      toggle.removeEventListener("click", handleToggle);
      if (doc.defaultView) {
        doc.defaultView.removeEventListener("admin-locale-applied", render);
      }
    },
  };
}
