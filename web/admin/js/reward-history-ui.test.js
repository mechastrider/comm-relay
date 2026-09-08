import assert from "node:assert/strict";
import test from "node:test";

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.className = "";
    this._textContent = "";
    this.disabled = false;
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }

  append(...children) {
    this.children.push(...children);
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  addEventListener(name, listener) {
    this.listeners[name] = listener;
  }
}

function descendants(node) {
  return node.children.flatMap(function (child) {
    return [child].concat(descendants(child));
  });
}

function deferred() {
  let resolve;
  const promise = new Promise(function (innerResolve) {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

test("viewer and channel rows preserve hostile long localized text as text nodes", async function (t) {
  t.mock.module("./api.js", {
    namedExports: {
      apiURL: (path) => path,
      mapHTTPError: () => "request failed",
      readJSON: async (response) => response.payload,
    },
  });
  t.mock.module("./i18n-ui.js", {
    namedExports: {
      getLocale: () => "ru-RU",
      t: (key, values) => {
        if (key === "history.loadedCount") {
          return "Загружено: " + values.count;
        }
        if (key === "history.loadFailed") {
          return "Не удалось загрузить историю наград.";
        }
        if (key === "state.retry") {
          return "Повторить";
        }
        return key;
      },
    },
  });
  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement: (tagName) => new FakeElement(tagName),
    getElementById: () => null,
  };
  t.after(function () {
    globalThis.document = originalDocument;
  });

  const { cancelViewerRewardHistory, createViewerRewardHistory, renderHistory } = await import("./reward-history.js");
  const mount = new FakeElement("div");
  const hostileViewer = "<Зритель & очень-длинное-имя>".repeat(8);
  const hostileReward = "<Награда & bonus>".repeat(8);
  renderHistory(mount, {
    entries: [{
      created_at: "2026-09-08T14:05:00Z",
      viewer_display_name: hostileViewer,
      reward_name: hostileReward,
      points: 25,
    }],
    nextCursor: null,
    loading: false,
    loadingMore: false,
    error: null,
    hasLoaded: true,
  }, { compact: false, controller: { loadFirst() {}, loadMore() {} } });

  const textNodes = descendants(mount).map(function (node) { return node.textContent; });
  assert.ok(textNodes.includes(hostileViewer));
  assert.ok(textNodes.includes(hostileReward));
  assert.ok(textNodes.includes("+25 XP"));
  assert.equal(mount.attributes["aria-busy"], "false");

  const retryCalls = [];
  renderHistory(mount, {
    entries: [{ id: "old" }],
    nextCursor: "older",
    loading: false,
    loadingMore: false,
    error: new Error("network diagnostic must not reach the panel"),
    errorRequest: "first",
    hasLoaded: true,
  }, {
    compact: false,
    controller: {
      loadFirst() { retryCalls.push("first"); },
      loadMore() { retryCalls.push("more"); },
    },
  });
  const retry = descendants(mount).find(function (node) {
    return node.tagName === "button" && node.textContent === "Повторить";
  });
  assert.ok(retry);
  retry.listeners.click();
  assert.deepEqual(retryCalls, ["first"]);
  const renderedText = descendants(mount).map(function (node) { return node.textContent; });
  assert.ok(renderedText.includes("Не удалось загрузить историю наград."));
  assert.equal(renderedText.includes("network diagnostic must not reach the panel"), false);

  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = function (url) {
    const request = deferred();
    requests.push({ url: String(url), request: request });
    return request.promise;
  };
  t.after(function () {
    globalThis.fetch = originalFetch;
  });
  const oldSection = createViewerRewardHistory("old-viewer");
  const reopenedSection = createViewerRewardHistory("viewer/with space");
  assert.equal(requests[0].url, "/api/reward-history?limit=5&viewer_id=old-viewer");
  assert.equal(requests[1].url, "/api/reward-history?limit=5&viewer_id=viewer%2Fwith+space");
  requests[1].request.resolve({
    ok: true,
    payload: { entries: [{ reward_name: "новая награда", points: 5, created_at: "2026-09-08T14:05:00Z" }], next_cursor: null },
  });
  requests[0].request.resolve({
    ok: true,
    payload: { entries: [{ reward_name: "устаревшая награда", points: 5, created_at: "2026-09-08T14:05:00Z" }], next_cursor: null },
  });
  await new Promise(function (resolve) { setImmediate(resolve); });
  const oldText = descendants(oldSection).map(function (node) { return node.textContent; });
  const reopenedText = descendants(reopenedSection).map(function (node) { return node.textContent; });
  assert.equal(oldText.includes("устаревшая награда"), false);
  assert.ok(reopenedText.includes("новая награда"));

  cancelViewerRewardHistory();
  globalThis.fetch = async function () {
    throw new Error("offline");
  };
  const failedSection = createViewerRewardHistory("failed-viewer");
  await new Promise(function (resolve) { setImmediate(resolve); });
  const failureMount = failedSection.children[1];
  assert.equal(failureMount.attributes["aria-busy"], "false");
  assert.ok(descendants(failureMount).some(function (node) {
    return node.className === "notice notice--error reward-history__error";
  }));
  cancelViewerRewardHistory();
});
