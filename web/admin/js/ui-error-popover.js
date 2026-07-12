import * as dom from './dom.js';
import { state } from './state.js';

export function positionErrorPopover(trigger) {
    if (!dom.statusErrorPopover || dom.statusErrorPopover.hidden) {
      return;
    }

    const viewportGap = 12;
    const triggerGap = 7;
    const triggerRect = trigger.getBoundingClientRect();
    const popoverRect = dom.statusErrorPopover.getBoundingClientRect();
    let left = triggerRect.right - popoverRect.width;
    let top = triggerRect.bottom + triggerGap;

    left = Math.max(
      viewportGap,
      Math.min(left, window.innerWidth - popoverRect.width - viewportGap)
    );
    if (top + popoverRect.height > window.innerHeight - viewportGap) {
      top = Math.max(viewportGap, triggerRect.top - popoverRect.height - triggerGap);
    }

    dom.statusErrorPopover.style.left = Math.round(left) + "px";
    dom.statusErrorPopover.style.top = Math.round(top) + "px";
  }

export function hideErrorPopover() {
    if (state.activeErrorTrigger) {
      state.activeErrorTrigger.setAttribute("aria-expanded", "false");
    }
    state.activeErrorTrigger = null;
    state.errorPopoverPinned = false;
    if (!dom.statusErrorPopover) {
      return;
    }
    dom.statusErrorPopover.hidden = true;
    dom.statusErrorPopover.textContent = "";
    dom.statusErrorPopover.style.left = "";
    dom.statusErrorPopover.style.top = "";
  }

export function showErrorPopover(trigger, pin) {
    if (!dom.statusErrorPopover || !trigger) {
      return;
    }
    if (state.activeErrorTrigger === trigger && state.errorPopoverPinned && !pin) {
      return;
    }
    if (state.activeErrorTrigger && state.activeErrorTrigger !== trigger) {
      state.activeErrorTrigger.setAttribute("aria-expanded", "false");
    }

    state.activeErrorTrigger = trigger;
    state.errorPopoverPinned = Boolean(pin);
    trigger.setAttribute("aria-expanded", "true");
    dom.statusErrorPopover.textContent = trigger.dataset.errorText || "";
    dom.statusErrorPopover.hidden = false;
    positionErrorPopover(trigger);
  }

export function createErrorDetailTrigger(errorText, contextLabel) {
    const trigger = document.createElement("button");
    trigger.className = "error-detail-trigger";
    trigger.type = "button";
    trigger.textContent = "Error";
    trigger.dataset.errorText = "Last error: " + errorText;
    trigger.setAttribute("aria-label", contextLabel + " technical error details");
    trigger.setAttribute("aria-controls", "status-error-popover");
    trigger.setAttribute("aria-describedby", "status-error-popover");
    trigger.setAttribute("aria-expanded", "false");

    trigger.addEventListener("mouseenter", function () {
      showErrorPopover(trigger, false);
    });
    trigger.addEventListener("mouseleave", function () {
      if (!state.errorPopoverPinned && document.activeElement !== trigger) {
        hideErrorPopover();
      }
    });
    trigger.addEventListener("focus", function () {
      showErrorPopover(trigger, false);
    });
    trigger.addEventListener("blur", function () {
      hideErrorPopover();
    });
    trigger.addEventListener("click", function () {
      if (state.activeErrorTrigger === trigger && state.errorPopoverPinned) {
        hideErrorPopover();
        return;
      }
      showErrorPopover(trigger, true);
    });

    return trigger;
  }

  document.addEventListener("pointerdown", function (event) {
    if (
      state.errorPopoverPinned &&
      state.activeErrorTrigger &&
      event.target !== state.activeErrorTrigger
    ) {
      hideErrorPopover();
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && state.activeErrorTrigger) {
      hideErrorPopover();
    }
  });
  window.addEventListener("resize", hideErrorPopover);
  window.addEventListener("scroll", hideErrorPopover, true);
