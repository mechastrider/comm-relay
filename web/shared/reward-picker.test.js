import assert from "node:assert/strict";
import test from "node:test";

import {
  awardGrantFailure,
  awardGrantRequest,
  awardGrantStatus,
  createRewardControl,
  enableRewardRetry,
  messageCanBeRewarded,
  restoreRewardTrigger,
  setRewardItemPending,
} from "./reward-picker.js";

class FakeElement {
  constructor(tagName, documentRef) {
    this.tagName = tagName;
    this.documentRef = documentRef;
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.dataset = {};
    this.listeners = new Map();
    this.className = "";
    this.style = {};
    this.disabled = false;
    this.tabIndex = 0;
    this._textContent = "";
    this.classList = {
      add: (...names) => { this.className += (this.className ? " " : "") + names.join(" "); },
      remove: (...names) => {
        this.className = this.className.split(" ").filter((name) => !names.includes(name)).join(" ");
      },
    };
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children.forEach((child) => { child.parentNode = null; });
    this.children = [];
  }

  get textContent() {
    return this._textContent;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  append(...children) {
    children.forEach((child) => this.appendChild(child));
  }

  removeChild(child) {
    this.children = this.children.filter((candidate) => candidate !== child);
    child.parentNode = null;
  }

  insertBefore(child, before) {
    child.parentNode = this;
    const index = this.children.indexOf(before);
    this.children.splice(index < 0 ? this.children.length : index, 0, child);
  }

  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  getAttribute(name) { return this.attributes.get(name) || null; }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  dispatch(type, event = {}) { this.listeners.get(type)?.({ type, target: this, preventDefault() {}, ...event }); }
  focus() { this.documentRef.activeElement = this; }
  getBoundingClientRect() { return { left: 10, top: 10, bottom: 30, width: 80 }; }
  closest() { return this.documentRef.documentElement; }
  contains(target) { return target === this || this.children.some((child) => child.contains(target)); }
  querySelector(selector) {
    const className = selector.startsWith(".") ? selector.slice(1) : "";
    if (this.className.split(" ").includes(className)) {
      return this;
    }
    for (const child of this.children) {
      const found = child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }
}

function fakeDocument() {
  const listeners = new Map();
  const documentRef = {
    activeElement: null,
    createElement(tagName) { return new FakeElement(tagName, documentRef); },
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type) { listeners.delete(type); },
    dispatch(type, event = {}) { listeners.get(type)?.({ type, preventDefault() {}, ...event }); },
  };
  documentRef.documentElement = documentRef.createElement("html");
  documentRef.documentElement.getBoundingClientRect = () => ({ top: 0, bottom: 400 });
  documentRef.body = documentRef.createElement("body");
  return documentRef;
}

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

test("awardGrantRequest includes only available transient message context", function () {
  const request = awardGrantRequest(
    { platform: "twitch", user_id: "42", id: "msg-7", message: "A useful callout" },
    { id: "advice", name: "Advice", points: 50 }
  );

  assert.deepEqual(request, {
    platform: "twitch",
    user_id: "42",
    award_id: "advice",
    message_id: "msg-7",
    message_text: "A useful callout",
  });
});

test("selected reward option is busy during a request and becomes retryable after failure", function () {
  const attributes = new Map();
  const item = {
    disabled: false,
    setAttribute: function (name, value) { attributes.set(name, value); },
  };

  setRewardItemPending(item, true);
  assert.equal(item.disabled, true);
  assert.equal(attributes.get("aria-busy"), "true");
  setRewardItemPending(item, false);
  assert.equal(item.disabled, false);
  assert.equal(attributes.get("aria-busy"), "false");
});

test("awardGrantRequest supports a message without source id or text", function () {
  assert.deepEqual(
    awardGrantRequest({ platform: "youtube", user_id: "viewer" }, { id: "joke" }),
    { platform: "youtube", user_id: "viewer", award_id: "joke" }
  );
  assert.equal(messageCanBeRewarded({ platform: "youtube", user_id: "viewer" }), true);
});

test("awardGrantStatus is localized through the supplied formatter", function () {
  assert.equal(
    awardGrantStatus(function (key, values) { return key + ":" + values.award + ":" + values.points; }, { id: "joke", name: "Joke", points: 10 }),
    "reward.grantSucceeded:Joke:10"
  );
  assert.equal(awardGrantFailure(function (key) { return key + ":localized"; }), "reward.grantFailed:localized");
});

test("reward trigger restores focus on success and stays retryable after failure", function () {
  const attributes = new Map();
  let focused = 0;
  const trigger = {
    disabled: true,
    setAttribute: function (name, value) { attributes.set(name, value); },
    focus: function () { focused += 1; },
  };

  restoreRewardTrigger(trigger);
  assert.equal(trigger.disabled, false);
  assert.equal(attributes.get("aria-expanded"), "false");
  assert.equal(focused, 1);

  trigger.disabled = true;
  enableRewardRetry(trigger);
  assert.equal(trigger.disabled, false);
  assert.equal(focused, 1);
});

test("Escape and outside click cannot dismiss a pending picker or trigger a second grant", async function () {
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;
  const documentRef = fakeDocument();
  const grant = deferred();
  let grantCalls = 0;
  globalThis.document = documentRef;
  globalThis.fetch = async function (url) {
    if (String(url).endsWith("/api/awards")) {
      return { ok: true, json: async () => ({ awards: [{ id: "advice", name: "Совет", points: 50 }] }) };
    }
    grantCalls += 1;
    return grant.promise;
  };

  try {
    const button = createRewardControl(
      { platform: "twitch", user_id: "42", id: "msg", message: "Long source" },
      { t: (key) => key, resolveURL: (path) => path, displayName: () => "Nova" }
    );
    const row = documentRef.createElement("div");
    row.className = "message-panel";
    row.appendChild(button);
    documentRef.body.appendChild(row);

    button.dispatch("click");
    await settle();
    const picker = documentRef.body.querySelector(".reward-picker");
    const item = picker.querySelector(".reward-picker__item");
    item.dispatch("click");
    await settle();

    documentRef.dispatch("keydown", { key: "Escape" });
    documentRef.dispatch("pointerdown", { target: documentRef.createElement("aside") });
    button.dispatch("click");
    assert.equal(grantCalls, 1);
    assert.equal(button.disabled, true);
    assert.equal(documentRef.body.querySelector(".reward-picker"), picker);

    grant.resolve({ ok: true });
    await settle();
    assert.equal(documentRef.body.querySelector(".reward-picker"), null);
    assert.equal(button.disabled, false);
    assert.equal(button.getAttribute("aria-expanded"), "false");
  } finally {
    globalThis.document = originalDocument;
    globalThis.fetch = originalFetch;
  }
});
