import { isDebugScenarioCompatible } from "./overlay-debug-helpers.js";

function copyPayload(payload) {
  return payload ? { ...payload } : null;
}

/**
 * Keeps replay eligibility independent from the Studio DOM. A payload becomes
 * replayable only after its request succeeds; a reset intentionally preserves
 * it, while closing test mode or switching to an incompatible surface clears it.
 */
export function createOverlayDebugController() {
  let busy = false;
  let lastSuccessfulPayload = null;
  let requestSequence = 0;
  let activeRequest = 0;
  let activePayload = null;
  let activeKind = null;

  return {
    beginScenario(payload) {
      if (busy) {
        return 0;
      }
      busy = true;
      requestSequence += 1;
      activeRequest = requestSequence;
      activePayload = copyPayload(payload);
      activeKind = "scenario";
      return activeRequest;
    },

    beginReset() {
      if (activeKind === "reset") {
        return 0;
      }
      busy = true;
      requestSequence += 1;
      activeRequest = requestSequence;
      activePayload = null;
      activeKind = "reset";
      return activeRequest;
    },

    completeRequest(requestID, payload) {
      if (!busy || requestID !== activeRequest) {
        return false;
      }
      busy = false;
      activePayload = null;
      activeKind = null;
      if (payload) {
        lastSuccessfulPayload = copyPayload(payload);
      }
      return true;
    },

    failRequest(requestID) {
      if (!busy || requestID !== activeRequest) {
        return false;
      }
      busy = false;
      activePayload = null;
      activeKind = null;
      return true;
    },

    isBusy() {
      return busy;
    },

    canStartReset() {
      return activeKind !== "reset";
    },

    replayPayload(surface) {
      if (busy || !isDebugScenarioCompatible(surface, lastSuccessfulPayload)) {
        return null;
      }
      return copyPayload(lastSuccessfulPayload);
    },

    clearIncompatible(surface) {
      if (!isDebugScenarioCompatible(surface, lastSuccessfulPayload)) {
        lastSuccessfulPayload = null;
      }
      if (activeKind === "scenario" && !isDebugScenarioCompatible(surface, activePayload)) {
        busy = false;
        activePayload = null;
        activeRequest = 0;
        activeKind = null;
      }
    },

    close() {
      busy = false;
      lastSuccessfulPayload = null;
      activePayload = null;
      activeRequest = 0;
      activeKind = null;
    },
  };
}

/**
 * Serializes server mutations in the order the operator invoked them. This is
 * intentionally separate from UI request state: invalidating a stale response
 * does not stop its HTTP handler, so a later Reset must wait until an earlier
 * Run has finished at the server boundary before it is sent.
 */
export function createOverlayDebugRequestQueue() {
  let tail = Promise.resolve();

  return {
    enqueue(request) {
      const current = tail.then(
        function () {
          return request();
        },
        function () {
          return request();
        }
      );
      tail = current.then(
        function () {},
        function () {}
      );
      return current;
    },
  };
}
