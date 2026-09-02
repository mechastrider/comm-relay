import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  awardMessageKey,
  findRewardedEntry,
  restartRewardHighlight,
  rewardLabelText,
} from "./reward-highlight.js";
import { createRewardSlot, setRewardSlot } from "../shared/chat-render.js";

class FakeTextNode {
  constructor(text) {
    this.textContent = text;
    this.parentNode = null;
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.className = "";
    this.title = "";
    this._textContent = "";
    this.classList = {
      add: (...names) => {
        const classes = new Set(this.className.split(" ").filter(Boolean));
        names.forEach((name) => classes.add(name));
        this.className = [...classes].join(" ");
      },
      remove: (...names) => {
        const classes = new Set(this.className.split(" ").filter(Boolean));
        names.forEach((name) => classes.delete(name));
        this.className = [...classes].join(" ");
      },
      contains: (name) => this.className.split(" ").includes(name),
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

  get childNodes() {
    return this.children;
  }

  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  getAttribute(name) { return this.attributes.get(name) || null; }

  querySelector(selector) {
    const className = selector.startsWith(".") ? selector.slice(1) : "";
    if (this.className.split(" ").includes(className)) {
      return this;
    }
    for (const child of this.children) {
      const found = typeof child.querySelector === "function" ? child.querySelector(selector) : null;
      if (found) {
        return found;
      }
    }
    return null;
  }
}

function fakeDocument() {
  return {
    createElement(tagName) { return new FakeElement(tagName); },
    createTextNode(text) { return new FakeTextNode(text); },
  };
}

function assertChildIdentity(actual, expected) {
  assert.equal(actual.length, expected.length);
  actual.forEach(function (child, index) {
    assert.strictEqual(child, expected[index]);
  });
}

test("findRewardedEntry matches only the exact platform and message id", function () {
  const exact = { messageKey: "twitch\0same", rewardTimer: null };
  const differentPlatform = { messageKey: "youtube\0same", rewardTimer: null };
  const alert = { source: "award", message_platform: "twitch", message_id: "same" };

  assert.equal(awardMessageKey(alert), "twitch\0same");
  assert.equal(findRewardedEntry([differentPlatform, exact], alert), exact);
  assert.equal(findRewardedEntry([exact], { source: "award", message_platform: "twitch" }), null);
  assert.equal(findRewardedEntry([exact], { source: "command", message_platform: "twitch", message_id: "same" }), null);
});

test("rewardLabelText keeps award meaning and a non-color points label", function () {
  assert.equal(rewardLabelText({ award_name: "Advice", points: 50 }), "Advice +50");
  assert.equal(rewardLabelText({ award_name: "  Advice  ", points: 0 }), "Advice");
  assert.equal(rewardLabelText({ points: 10 }), "+10");
  assert.equal(rewardLabelText({ award_name: "", points: -1 }), "");
});

test("restartRewardHighlight replaces the previous timer", function () {
  const entry = { rewardTimer: 7 };
  const cleared = [];
  let timerCallback;
  let starts = 0;
  let ends = 0;
  const alert = { source: "award", message_platform: "twitch", message_id: "same", points: 10 };

  assert.equal(restartRewardHighlight(entry, alert, {
    clearTimeout: function (id) { cleared.push(id); },
    setTimeout: function (callback) { timerCallback = callback; return 8; },
    onStart: function () { starts += 1; },
    onEnd: function () { ends += 1; },
  }), true);
  assert.deepEqual(cleared, [7]);
  assert.equal(starts, 1);
  assert.equal(entry.rewardTimer, 8);

  timerCallback();
  assert.equal(ends, 1);
  assert.equal(entry.rewardTimer, null);
  assert.equal(entry.reward, null);
});

test("reward transitions preserve rendered rich child identities", function () {
  const originalDocument = globalThis.document;
  globalThis.document = fakeDocument();
  try {
    const row = document.createElement("div");
    row.className = "message";
    const avatar = document.createElement("img");
    avatar.className = "message__avatar";
    const identity = document.createElement("span");
    identity.className = "message__identity";
    const text = document.createElement("span");
    text.className = "message__text";
    const emote = document.createElement("img");
    emote.className = "message__emote";
    const loadedPreview = document.createElement("img");
    loadedPreview.className = "message__image-preview";
    const failedPreviewFallback = document.createTextNode("https://example.test/preview.png");
    text.append(emote, loadedPreview, failedPreviewFallback);
    const rewardSlot = createRewardSlot();
    row.append(avatar, identity, text, rewardSlot);

    const originalRowChildren = [...row.children];
    const originalTextChildren = [...text.childNodes];
    const entry = { rewardTimer: null };
    let timer;
    const applyReward = function (reward) {
      setRewardSlot(rewardSlot, reward, rewardLabelText(reward));
      if (reward) {
        row.classList.add("message--rewarded");
      } else {
        row.classList.remove("message--rewarded");
      }
    };
    const alert = { source: "award", message_platform: "twitch", message_id: "rich", award_name: "Advice", points: 50 };

    restartRewardHighlight(entry, alert, {
      clearTimeout() {},
      setTimeout(callback) { timer = callback; return 1; },
      onStart(_entry, reward) { applyReward(reward); },
      onEnd() { applyReward(null); },
    });
    assertChildIdentity(row.children, originalRowChildren);
    assertChildIdentity(text.childNodes, originalTextChildren);
    assert.equal(row.classList.contains("message--rewarded"), true);

    timer();
    assertChildIdentity(row.children, originalRowChildren);
    assertChildIdentity(text.childNodes, originalTextChildren);
    assert.equal(row.classList.contains("message--rewarded"), false);

    restartRewardHighlight(entry, { ...alert, points: 75 }, {
      clearTimeout() {},
      setTimeout(callback) { timer = callback; return 2; },
      onStart(_entry, reward) { applyReward(reward); },
      onEnd() { applyReward(null); },
    });
    assertChildIdentity(row.children, originalRowChildren);
    assertChildIdentity(text.childNodes, originalTextChildren);
    assert.equal(row.querySelector(".message__reward-points").textContent, "+75");
  } finally {
    globalThis.document = originalDocument;
  }
});

test("every chat theme has animated, non-color reward feedback with a static fallback", async function () {
  const css = await readFile(new URL("./overlay.css", import.meta.url), "utf8");

  assert.match(css, /\.message__reward/);
  assert.match(css, /body\.overlay-theme--dashboard \.message--rewarded/);
  assert.match(css, /body\.overlay-theme--cockpit-panel \.message--rewarded/);
  assert.match(css, /body\.overlay-theme--cockpit-popups \.message--rewarded/);
  assert.match(css, /body\.overlay-theme--g-rebels-popups \.message--rewarded/);
  assert.match(
    css,
    /\.message\.message--rewarded:not\(\.message--leaving\)\s*\{[^}]*animation:\s*message-reward-pulse/
  );
  assert.match(css, /@keyframes message-reward-pulse/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.message--rewarded\s*\{[^}]*animation:\s*none\s*!important/
  );
  assert.match(css, /\.message__reward-name[\s\S]*?text-overflow:\s*ellipsis/);
  assert.match(css, /\.message__reward-points[\s\S]*?flex:\s*0 0 auto/);
  assert.doesNotMatch(css, /\.message__reward\s*\{[^}]*position:\s*absolute/);
});

test("reward rows reserve an absolute badge slot before feedback without changing row geometry", async function () {
  const overlay = await readFile(new URL("./overlay.js", import.meta.url), "utf8");
  const css = await readFile(new URL("./overlay.css", import.meta.url), "utf8");
  assert.match(overlay, /const rewardSlot = createRewardSlot\(\)/);
  assert.match(overlay, /row\.appendChild\(rewardSlot\)/);
  assert.match(overlay, /setRewardSlot\(rewardSlot, reward, rewardLabelText\(reward\)\)/);
  assert.match(overlay, /updateRewardFeedback\(target\.el, target\.rewardSlot, reward\)/);
  assert.match(overlay, /updateRewardFeedback\(target\.el, target\.rewardSlot, null\)/);
  assert.doesNotMatch(overlay, /onStart: function \(target, reward\) \{\s*fillMessageRow/);
  assert.doesNotMatch(overlay, /onEnd: function \(target\) \{\s*fillMessageRow/);
  assert.match(css, /\.message__reward-slot\s*\{[\s\S]*?position:\s*absolute/);
  assert.match(css, /\.message\s*\{[\s\S]*?--message-reward-slot-width/);
  assert.match(css, /padding-right:\s*calc\([^;]*--message-reward-slot-width/);
  assert.match(css, /\.message__reward-name[\s\S]*?text-overflow:\s*ellipsis/);
  assert.match(css, /\.message__reward-points[\s\S]*?flex:\s*0 0 auto/);
});

function dashboardMessagePaddingRight(css) {
  let value = "";
  let specificity = -1;
  const blocks = css.matchAll(/([^{}]+)\{([^{}]*)\}/g);
  for (const match of blocks) {
    const selector = match[1];
    const applies = selector.includes(".message") &&
      (selector.includes("body.overlay-theme--dashboard .message") || selector.trim() === ".message");
    if (!applies) {
      continue;
    }
    const nextSpecificity = selector.includes("body.overlay-theme--dashboard .message") ? 21 : 10;
    const declarations = match[2].replaceAll(/\/\*[\s\S]*?\*\//g, "").split(";");
    for (const declaration of declarations) {
      const parsed = declaration.match(/^\s*(padding|padding-right)\s*:\s*(.+)$/);
      if (!parsed) {
        continue;
      }
      if (nextSpecificity > specificity || nextSpecificity === specificity) {
        if (parsed[1] === "padding-right" || parsed[1] === "padding") {
          value = parsed[1] === "padding" ? parsed[2].trim().split(/\s+/).at(-1) : parsed[2].trim();
          specificity = nextSpecificity;
        }
      }
    }
  }
  return value;
}

test("dashboard cascade keeps the reserved reward slot after its later padding reset", async function () {
  const css = await readFile(new URL("./overlay.css", import.meta.url), "utf8");

  // This resolves the winning declaration for a dashboard row (specificity and
  // source order), rather than merely checking that the base .message rule has
  // a reservation. A later dashboard padding reset would compute to zero.
  assert.equal(
    dashboardMessagePaddingRight(css),
    "calc(var(--overlay-message-padding-x) + var(--message-reward-slot-width))"
  );
});
