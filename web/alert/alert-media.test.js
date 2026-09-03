import assert from "node:assert/strict";
import test from "node:test";

import {
  alertRenderModel,
  createAlertSplash,
  normalizeAlertLayout,
  safeStoredAssetFilename,
} from "./alert-render.js";
import { playAlertAudio } from "./alert-sound.js";

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.className = "";
    this.textContent = "";
    this.src = "";
    this.attributes = {};
    this.style = { setProperty: () => {} };
    this.classList = { add: () => {} };
  }

  append(...children) {
    this.children.push(...children);
  }

  setAttribute() {}
  addEventListener() {}
  replaceWith(node) {
    Object.assign(this, node);
  }
}

const fakeDocument = { createElement: (tagName) => new FakeElement(tagName) };

test("uses overlay asset URL for stored image filenames", function () {
  const model = alertRenderModel({
    source: "command",
    name: "Nova",
    text: "GG",
    image_asset: "asset_ab12cd34.png",
    avatar_url: "https://example.test/avatar.png",
  });
  assert.equal(model.imageAsset, "asset_ab12cd34.png");
  assert.equal(model.avatarURL, "https://example.test/avatar.png");

  const splash = createAlertSplash(
    fakeDocument,
    {
      source: "command",
      name: "Nova",
      text: "GG",
      image_asset: "asset_ab12cd34.png",
      layout: "banner",
    },
    {
      overlayAssetURL: function (filename) {
        return "/overlay/assets/" + filename + "?v=1";
      },
    }
  );
  assert.match(splash.className, /alert-splash--layout-banner/);
  const image = splash.children[0];
  assert.equal(image.src, "/overlay/assets/asset_ab12cd34.png?v=1");
});

test("falls back to avatar when custom image filename is unsafe", function () {
  const splash = createAlertSplash(fakeDocument, {
    source: "command",
    name: "Nova",
    text: "GG",
    image_asset: "https://evil.test/x.png",
    avatar_url: "https://example.test/avatar.png",
  });
  const image = splash.children[0];
  assert.equal(image.src, "https://example.test/avatar.png");
});

test("rejects remote filenames and normalizes layout", function () {
  assert.equal(safeStoredAssetFilename("../secret.png"), "");
  assert.equal(safeStoredAssetFilename("asset_ok.webp"), "asset_ok.webp");
  assert.equal(normalizeAlertLayout("fullscreen"), "fullscreen");
  assert.equal(normalizeAlertLayout("grid"), "card");
});

test("playAlertAudio uses custom file instead of built-in tone", async function () {
  let playedURL = "";
  const OriginalAudio = globalThis.Audio;
  globalThis.Audio = class {
    constructor(url) {
      playedURL = url;
    }
    set volume(_) {}
    play() {
      return Promise.resolve();
    }
  };
  try {
    await playAlertAudio(
      {},
      { sound_file: "asset_beef.wav", sound: "chime", sound_volume: 50 },
      function (filename) {
        return "/overlay/assets/" + filename;
      }
    );
    assert.equal(playedURL, "/overlay/assets/asset_beef.wav");
  } finally {
    globalThis.Audio = OriginalAudio;
  }
});
