import assert from "node:assert/strict";
import test from "node:test";

import {
  alertRenderModel,
  combinedAlertPortraitScale,
  createAlertSplash,
  safeImageURL,
} from "./alert-render.js";

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.className = "";
    this.textContent = "";
    this.attributes = {};
    this.style = { setProperty: () => {} };
    this.classList = { add: () => {} };
  }

  append(...children) {
    this.children.push(...children);
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
    if (name === "class") {
      this.className = value;
    }
  }

  addEventListener() {}
}

const fakeDocument = {
  createElement: (tagName) => new FakeElement(tagName),
  createElementNS: (_namespace, tagName) => new FakeElement(tagName),
};

function byClass(element, className) {
  if (element.className.split(" ").includes(className)) {
    return element;
  }
  for (const child of element.children) {
    const found = byClass(child, className);
    if (found) {
      return found;
    }
  }
  return null;
}

test("builds an award hierarchy with text nodes and an optional quote", function () {
  const untrustedQuote = '<img src=x onerror="alert(1)"> Прекрасный выстрел';
  const splash = createAlertSplash(fakeDocument, {
    source: "award",
    award_name: "Spotter",
    name: "Nova",
    points: 25,
    message_text: untrustedQuote,
    avatar_url: "javascript:alert(1)",
  });

  assert.equal(splash.className, "alert-splash alert-splash--award alert-splash--layout-fullscreen");
  assert.equal(byClass(splash, "alert-award-name").textContent, "Spotter");
  assert.equal(byClass(splash, "alert-award-viewer").textContent, "Nova");
  assert.equal(byClass(splash, "alert-points").textContent, "+25");
  assert.equal(byClass(splash, "alert-quote").textContent, untrustedQuote);
  const placeholder = byClass(splash, "alert-avatar--placeholder");
  assert.equal(placeholder.textContent, "");
  assert.ok(byClass(placeholder, "alert-avatar__placeholder-icon"));
  assert.equal(Object.hasOwn(byClass(splash, "alert-quote"), "innerHTML"), false);
});

test("omits empty award fields and preserves the command presentation", function () {
  const award = createAlertSplash(fakeDocument, {
    source: "award",
    name: "",
    award_name: "",
    points: 0,
    message_text: "   ",
  });
  assert.equal(byClass(award, "alert-award-name").textContent, "Award");
  assert.equal(byClass(award, "alert-award-viewer").textContent, "Viewer");
  assert.equal(byClass(award, "alert-points"), null);
  assert.equal(byClass(award, "alert-quote"), null);

  const command = createAlertSplash(fakeDocument, {
    source: "command",
    name: "Nova",
    text: "Good game, Nova!",
  });
  assert.equal(command.className, "alert-splash alert-splash--command alert-splash--layout-fullscreen");
  assert.equal(byClass(command, "alert-text").textContent, "Good game, Nova!");
});

test("only permits http(s) avatars and keeps render-model values safe", function () {
  assert.equal(safeImageURL("https://example.test/avatar.png"), "https://example.test/avatar.png");
  assert.equal(safeImageURL("data:image/png;base64,abc"), "");
  assert.deepEqual(alertRenderModel({ source: "unknown", text: "legacy" }), {
    kind: "command",
    name: "Viewer",
    text: "legacy",
    avatarURL: "",
    imageAsset: "",
    layout: "fullscreen",
    imageFit: "contain",
    imageSizePct: 100,
  });
});

test("combinedAlertPortraitScale multiplies preset and per-item size", function () {
  assert.equal(combinedAlertPortraitScale(1.5, 200, true), 3);
  assert.equal(combinedAlertPortraitScale(2, 100, false), 2);
});
