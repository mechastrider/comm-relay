import assert from "node:assert/strict";
import test from "node:test";
import {
  commandOutcomeFromRecentField,
  commandOutcomeFromWire,
  cooldownSecondsRemaining,
  commandOutcomeChromeKind,
  commandOutcomeReasonLabel,
  isCooldownOutcomeActive,
  isRejectedOutcomeActive,
  commandOutcomeMessageKey,
  applyCommandOutcomeChrome,
} from "./command-outcome-ui.js";

test("command outcome keys match platform and id", function () {
  assert.equal(commandOutcomeMessageKey("twitch", "abc"), "twitch\0abc");
  assert.equal(commandOutcomeMessageKey("", "abc"), "");
});

test("wire outcome maps cooldown remaining to expiry", function () {
  const parsed = commandOutcomeFromWire({
    type: "command_outcome",
    message_platform: "youtube",
    message_id: "1",
    trigger: "gg",
    status: "cooldown",
    cooldown_remaining_ms: 2500,
  }, 1000);
  assert.deepEqual(parsed, {
    platform: "youtube",
    id: "1",
    outcome: {
      trigger: "gg",
      status: "cooldown",
      cooldown_expires_at_ms: 3500,
      reason: "",
      reason_label: "",
    },
  });
});

test("recent field refresh uses read time", function () {
  const outcome = commandOutcomeFromRecentField({
    trigger: "gg",
    status: "cooldown",
    cooldown_remaining_ms: 4000,
  }, 10_000);
  assert.equal(outcome.cooldown_expires_at_ms, 14_000);
  assert.equal(cooldownSecondsRemaining(outcome.cooldown_expires_at_ms, 12_500), 2);
  assert.equal(isCooldownOutcomeActive(outcome, 14_001), false);
  assert.equal(commandOutcomeChromeKind(outcome, 12_000), "cooldown");
});

test("fired outcome is accepted chrome without countdown", function () {
  const outcome = commandOutcomeFromRecentField({
    trigger: "leaderboard",
    status: "fired",
    cooldown_remaining_ms: 0,
  }, 0);
  assert.equal(commandOutcomeChromeKind(outcome, 0), "accepted");
  assert.equal(isCooldownOutcomeActive(outcome, 0), false);
});

test("rejected outcome uses reason label and expires after display window", function () {
  const outcome = commandOutcomeFromRecentField({
    trigger: "like",
    status: "rejected",
    reason: "ambiguous",
    reason_label: "clarify",
  }, 1000);
  assert.equal(commandOutcomeChromeKind(outcome, 1000), "rejected");
  assert.equal(isRejectedOutcomeActive(outcome, 1000), true);
  assert.equal(isRejectedOutcomeActive(outcome, 7000), false);
  assert.equal(
    commandOutcomeReasonLabel(outcome, function (key) {
      return key === "msg.commandReject.ambiguous" ? "Clarify" : key;
    }),
    "clarify"
  );
});

test("unknown reject reason falls back to i18n map", function () {
  const outcome = commandOutcomeFromRecentField({
    trigger: "buff",
    status: "rejected",
    reason: "quota",
  }, 0);
  const label = commandOutcomeReasonLabel(outcome, function (key) {
    if (key === "msg.commandReject.quota") {
      return "Quota";
    }
    if (key === "msg.commandRejected") {
      return "Rejected";
    }
    return key;
  });
  assert.equal(label, "Quota");
});

class OutcomeFake {
  constructor(tagName, documentRef) {
    this.tagName = tagName;
    this.documentRef = documentRef;
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.className = "";
    this._textContent = "";
    this.classList = {
      add: (name) => {
        if (!this.className.split(" ").includes(name)) {
          this.className += (this.className ? " " : "") + name;
        }
      },
      remove: (name) => {
        this.className = this.className.split(" ").filter((n) => n !== name).join(" ");
      },
      toggle: (name, force) => {
        const has = this.className.split(" ").includes(name);
        if (force === false || (force === undefined && has)) {
          this.classList.remove(name);
          return false;
        }
        this.classList.add(name);
        return true;
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

  removeChild(child) {
    this.children = this.children.filter((candidate) => candidate !== child);
    child.parentNode = null;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  insertBefore(child, before) {
    child.parentNode = this;
    const index = this.children.indexOf(before);
    this.children.splice(index < 0 ? this.children.length : index, 0, child);
  }

  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  getAttribute(name) { return this.attributes.get(name) || null; }

  querySelector(selector) {
    if (selector.startsWith(".")) {
      if (this.className.split(" ").includes(selector.slice(1))) {
        return this;
      }
    } else if (this.tagName === selector) {
      return this;
    }
    for (const child of this.children) {
      const found = child.querySelector(selector);
      if (found) {
        return found;
      }
    }
    return null;
  }
}

function outcomeDocument() {
  const documentRef = {
    createElement(tagName) { return new OutcomeFake(tagName, documentRef); },
    createElementNS(_ns, tagName) { return new OutcomeFake(tagName, documentRef); },
  };
  return documentRef;
}

function translate(key, params) {
  if (key === "msg.commandAccepted") {
    return "Command accepted";
  }
  if (key === "msg.commandCooldownRemaining") {
    return String(params.seconds) + "s left";
  }
  if (key === "msg.commandCooldownShort") {
    return String(params.seconds) + "s";
  }
  if (key === "msg.commandCooldownFrozen") {
    return "Command on cooldown";
  }
  if (key === "msg.commandRejectedFrozen") {
    return "Command rejected";
  }
  return key;
}

test("accepted chrome is a checkmark status, not a text chip or button", function () {
  const originalDocument = globalThis.document;
  const documentRef = outcomeDocument();
  globalThis.document = documentRef;
  try {
    const item = documentRef.createElement("li");
    const meta = documentRef.createElement("div");
    meta.className = "message-list__meta";
    const actions = documentRef.createElement("div");
    actions.className = "message-list__actions";
    meta.appendChild(actions);
    item.appendChild(meta);

    applyCommandOutcomeChrome(item, { status: "fired", trigger: "gg" }, 0, translate);

    const badge = item.querySelector(".message-list__command-outcome");
    assert.equal(badge.tagName, "span");
    assert.equal(badge.getAttribute("role"), "status");
    assert.equal(badge.getAttribute("aria-label"), "Command accepted");
    assert.ok(badge.querySelector("svg"));
    assert.equal(badge.querySelector(".message-list__command-outcome-label"), null);
    assert.equal(meta.children[0], badge);
    assert.equal(meta.children[1], actions);
    assert.match(item.className, /message-list__item--command-accepted/);
  } finally {
    globalThis.document = originalDocument;
  }
});

test("frozen chrome shows a snowflake plus compact countdown or reject label", function () {
  const originalDocument = globalThis.document;
  const documentRef = outcomeDocument();
  globalThis.document = documentRef;
  try {
    const item = documentRef.createElement("li");
    const meta = documentRef.createElement("div");
    meta.className = "message-list__meta";
    item.appendChild(meta);

    applyCommandOutcomeChrome(item, {
      status: "cooldown",
      trigger: "gg",
      cooldown_expires_at_ms: 12_000,
    }, 0, translate);
    let badge = item.querySelector(".message-list__command-outcome");
    assert.match(badge.className, /message-list__command-outcome--frozen/);
    assert.ok(badge.querySelector("svg"));
    assert.equal(badge.querySelector(".message-list__command-outcome-label").textContent, "12s");

    applyCommandOutcomeChrome(item, {
      status: "rejected",
      trigger: "like",
      reason_label: "Clarify",
      rejected_expires_at_ms: 5000,
    }, 0, translate);
    badge = item.querySelector(".message-list__command-outcome");
    assert.equal(badge.querySelector(".message-list__command-outcome-label").textContent, "Clarify");
    assert.match(item.className, /message-list__item--command-rejected/);
  } finally {
    globalThis.document = originalDocument;
  }
});
