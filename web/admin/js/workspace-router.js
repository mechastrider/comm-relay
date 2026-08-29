import { isSettingsWorkspaceHash } from "./settings-helpers.js";

/** @typedef {"live"|"audience"|"studio"|"settings"} WorkspaceId */

/** @type {readonly WorkspaceId[]} */
export const WORKSPACES = Object.freeze(["live", "audience", "studio", "settings"]);

/**
 * @param {string | null | undefined} hash
 * @returns {WorkspaceId}
 */
export function parseWorkspaceHash(hash) {
  if (!hash || hash === "#" || hash === "") {
    return "live";
  }
  const raw = hash.charAt(0) === "#" ? hash.slice(1) : hash;
  const id = raw.toLowerCase().split("/")[0];
  if (WORKSPACES.includes(/** @type {WorkspaceId} */ (id))) {
    return /** @type {WorkspaceId} */ (id);
  }
  if (isSettingsWorkspaceHash(hash)) {
    return "settings";
  }
  return "live";
}

/**
 * @param {WorkspaceId} id
 * @returns {string}
 */
export function workspaceHash(id) {
  return "#" + id;
}

/**
 * @param {WorkspaceId} id
 * @returns {string}
 */
export function workspaceSectionId(id) {
  return "workspace-" + id;
}

/**
 * @param {Document} doc
 * @param {WorkspaceId} workspaceId
 * @param {(key: string) => string} translate
 */
function announceWorkspace(doc, workspaceId, translate) {
  const region = doc.getElementById("shell-announcements");
  if (!region) {
    return;
  }
  const key = "workspace.announce." + workspaceId;
  const message = translate(key);
  region.textContent = "";
  window.requestAnimationFrame(function () {
    region.textContent = message;
  });
}

/**
 * @param {Document} doc
 * @param {WorkspaceId} workspaceId
 * @param {{ announce?: boolean, focusHeading?: boolean, translate?: (key: string) => string }} [options]
 */
export function applyWorkspace(doc, workspaceId, options) {
  const shouldAnnounce = !options || options.announce !== false;
  const translate = (options && options.translate) || function (key) {
    return key;
  };

  WORKSPACES.forEach(function (id) {
    const section = doc.getElementById(workspaceSectionId(id));
    if (section) {
      const active = id === workspaceId;
      section.hidden = !active;
      section.classList.toggle("workspace--active", active);
    }
  });

  doc.querySelectorAll("[data-workspace-nav]").forEach(function (link) {
    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }
    const navId = link.getAttribute("data-workspace-nav");
    const active = navId === workspaceId;
    if (active) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  if (!options || options.focusHeading !== false) {
    const heading = doc.querySelector(
      "#" + workspaceSectionId(workspaceId) + " .workspace-heading"
    );
    if (heading instanceof HTMLElement) {
      heading.focus({ preventScroll: false });
    }
  }

  const titleBase = "CommRelay";
  const headingText = doc.querySelector(
    "#" + workspaceSectionId(workspaceId) + " .workspace-heading"
  );
  if (headingText && headingText.textContent) {
    doc.title = headingText.textContent.trim() + " — " + titleBase;
  } else {
    doc.title = titleBase;
  }

  if (shouldAnnounce) {
    announceWorkspace(doc, workspaceId, translate);
  }
}

/**
 * @param {Document} doc
 * @param {(key: string) => string} translate
 * @param {{ onWorkspaceChange?: (workspaceId: WorkspaceId) => void }} [routerOptions]
 * @returns {() => void}
 */
export function initWorkspaceRouter(doc, translate, routerOptions) {
  let lastWorkspace = parseWorkspaceHash(doc.location.hash);
  let initialized = false;

  function notifyWorkspaceChange(workspaceId) {
    if (routerOptions && typeof routerOptions.onWorkspaceChange === "function") {
      routerOptions.onWorkspaceChange(workspaceId);
    }
  }

  function syncFromLocation() {
    const workspaceId = parseWorkspaceHash(doc.location.hash);
    const workspaceChanged = workspaceId !== lastWorkspace;
    applyWorkspace(doc, workspaceId, {
      focusHeading: !initialized || workspaceChanged,
      translate,
    });
    initialized = true;
    if (workspaceChanged) {
      notifyWorkspaceChange(workspaceId);
      lastWorkspace = workspaceId;
    }
  }

  doc.defaultView.addEventListener("hashchange", syncFromLocation);
  doc.defaultView.addEventListener("popstate", syncFromLocation);

  if (!doc.location.hash || doc.location.hash === "#") {
    const live = parseWorkspaceHash(doc.location.hash);
    if (doc.location.hash !== workspaceHash(live)) {
      doc.location.replace(workspaceHash(live));
      return function () {
        doc.defaultView.removeEventListener("hashchange", syncFromLocation);
        doc.defaultView.removeEventListener("popstate", syncFromLocation);
      };
    }
  }

  syncFromLocation();
  notifyWorkspaceChange(lastWorkspace);

  return function disposeWorkspaceRouter() {
    doc.defaultView.removeEventListener("hashchange", syncFromLocation);
    doc.defaultView.removeEventListener("popstate", syncFromLocation);
  };
}
