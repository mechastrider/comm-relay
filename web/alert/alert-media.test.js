import assert from "node:assert/strict";
import test from "node:test";

import {
  alertRenderModel,
  createAlertSplash,
  normalizeAlertLayout,
  normalizeAlertImageFit,
  normalizeAlertImageSizePct,
  safeStoredAssetFilename,
  safeStoredImageAssetFilename,
  safeStoredSoundAssetFilename,
} from "./alert-render.js";
import { playAlertAudio, stopCustomAlertSound } from "./alert-sound.js";

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
  assert.equal(safeStoredImageAssetFilename("asset_ok.webp"), "asset_ok.webp");
  assert.equal(safeStoredImageAssetFilename("asset_ok.gif"), "");
  assert.equal(safeStoredSoundAssetFilename("asset_ok.mp3"), "asset_ok.mp3");
  assert.equal(safeStoredSoundAssetFilename("asset_ok.png"), "");
  assert.equal(normalizeAlertLayout("fullscreen"), "fullscreen");
  assert.equal(normalizeAlertLayout("grid"), "fullscreen");
  assert.equal(normalizeAlertImageFit("cover"), "cover");
  assert.equal(normalizeAlertImageFit("weird"), "contain");
  assert.equal(normalizeAlertImageSizePct(150), 150);
  assert.equal(normalizeAlertImageSizePct(10), 25);
});

test("playAlertAudio uses custom file instead of built-in tone", async function () {
  let playedURL = "";
  const OriginalAudio = globalThis.Audio;
  globalThis.Audio = class {
    constructor(url) {
      playedURL = url;
    }
    set volume(_) {}
    pause() {}
    play() {
      return Promise.resolve();
    }
    addEventListener() {}
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

test("stopCustomAlertSound stops previous custom audio before the next alert", async function () {
  let pauseCount = 0;
  const instances = [];
  const OriginalAudio = globalThis.Audio;
  globalThis.Audio = class {
    constructor(url) {
      this.url = url;
      this.volume = 1;
      this.currentTime = 5;
      instances.push(this);
    }
    pause() {
      pauseCount += 1;
    }
    play() {
      return Promise.resolve();
    }
    addEventListener() {}
  };
  try {
    await playAlertAudio(
      {},
      { sound_file: "asset_one.wav", sound_volume: 50 },
      function (filename) {
        return "/overlay/assets/" + filename;
      }
    );
    await playAlertAudio(
      {},
      { sound_file: "asset_two.wav", sound_volume: 50 },
      function (filename) {
        return "/overlay/assets/" + filename;
      }
    );
    assert.equal(pauseCount, 1);
    assert.equal(instances.length, 2);

    stopCustomAlertSound();
    assert.equal(instances[1].currentTime, 0);
  } finally {
    globalThis.Audio = OriginalAudio;
  }
});
