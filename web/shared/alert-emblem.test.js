import assert from "node:assert/strict";
import test from "node:test";

import { alertEmblemModel, createAlertEmblem } from "./alert-emblem.js";

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.className = "";
    this.textContent = "";
    this.attributes = {};
  }

  append(...children) {
    this.children.push(...children);
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === "class") {
      this.className = String(value);
    }
  }
}

const fakeDocument = {
  createElement: (tagName) => new FakeElement(tagName),
  createElementNS: (_namespace, tagName) => new FakeElement(tagName),
};

test("maps starter command and award identifiers to semantic symbols", function () {
  assert.equal(alertEmblemModel("command", "GG", "gg").symbol, "flags");
  assert.equal(alertEmblemModel("command", "hi", "hi").symbol, "broadcast");
  assert.equal(alertEmblemModel("award", "spotter", "Spotter").symbol, "reticle");
  assert.equal(alertEmblemModel("award", "mvp", "MVP").symbol, "laurel-star");
});

test("keeps generic emblem selection and monogram stable", function () {
  const first = alertEmblemModel("award", "community-hero", "Community Hero");
  const second = alertEmblemModel("award", "community-hero", "Community Hero");
  assert.deepEqual(first, second);
  assert.equal(first.monogram, "CH");
  assert.match(first.symbol, /^(medal|gem|burst)$/);
});

test("builds decorative SVG without parsing HTML", function () {
  const emblem = createAlertEmblem(fakeDocument, {
    kind: "command",
    identifier: "lurk",
    label: "<img onerror=alert(1)>",
  });
  assert.equal(emblem.attributes["aria-hidden"], "true");
  assert.ok(emblem.attributes["data-emblem-symbol"]);
  assert.equal(emblem.children[0].tagName, "svg");
  assert.equal(Object.hasOwn(emblem, "innerHTML"), false);
});
