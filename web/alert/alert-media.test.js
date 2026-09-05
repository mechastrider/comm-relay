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
import { createAlertEmblem } from "../shared/alert-emblem.js";
import { playAlertAudio, stopCustomAlertSound } from "./alert-sound.js";

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.className = "";
    this.textContent = "";
    this.src = "";
    this.attributes = {};
    this.listeners = {};
    this.style = { setProperty: () => {} };
    this.classList = { add: () => {} };
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
  addEventListener(name, listener) {
    this.listeners[name] = listener;
  }
  replaceWith(node) {
    Object.assign(this, node);
  }
}

const fakeDocument = {
  createElement: (tagName) => new FakeElement(tagName),
  createElementNS: (_namespace, tagName) => new FakeElement(tagName),
};

test("uses overlay asset URL for stored image filenames", function () {
  const model = alertRenderModel({
    source: "command",
    name: "Nova",
    text: "GG",
    image_asset: "asset_ab12cd34.png",
    avatar_url: "https://example.test/avatar.png",
  });
  assert.equal(model.imageAsset, "asset_ab12cd34.png");

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
      createEmblem: createAlertEmblem,
    }
  );
  assert.match(splash.className, /alert-splash--layout-banner/);
  const image = splash.children[0];
  assert.equal(image.src, "/overlay/assets/asset_ab12cd34.png?v=1");
});

test("falls back to a built-in emblem when custom image filename is unsafe", function () {
  const splash = createAlertSplash(fakeDocument, {
    source: "command",
    trigger: "gg",
    name: "Nova",
    text: "GG",
    image_asset: "https://evil.test/x.png",
    avatar_url: "https://example.test/avatar.png",
  }, { createEmblem: createAlertEmblem });
  const emblem = splash.children[0];
  assert.match(emblem.className, /alert-emblem--command/);
  assert.equal(emblem.attributes["data-emblem-symbol"], "flags");
});

test("rejects remote filenames and normalizes layout", function () {
  assert.equal(safeStoredAssetFilename("../secret.png"), "");
  assert.equal(safeStoredImageAssetFilename("asset_ok.webp"), "asset_ok.webp");
  assert.equal(safeStoredImageAssetFilename("asset_ok.gif"), "");
  assert.equal(safeStoredSoundAssetFilename("asset_ok.mp3"), "asset_ok.mp3");
  assert.equal(safeStoredSoundAssetFilename("asset_ok.png"), "");
  assert.equal(normalizeAlertLayout("fullscreen"), "fullscreen");
  assert.equal(normalizeAlertLayout("card"), "card");
  assert.equal(normalizeAlertLayout("grid"), "fullscreen");
  assert.equal(normalizeAlertImageFit("cover"), "cover");
  assert.equal(normalizeAlertImageFit("weird"), "contain");
  assert.equal(normalizeAlertImageSizePct(150), 150);
  assert.equal(normalizeAlertImageSizePct(10), 25);
});

test("renders tile mode as a repeated background with an image probe", function () {
  const splash = createAlertSplash(
    fakeDocument,
    {
      source: "command",
      name: "Nova",
      text: "Tiles",
      image_asset: "asset_tiles.png",
      image_fit: "tile",
      layout: "card",
    },
    {
      overlayAssetURL: function (filename) {
        return "/overlay/assets/" + filename;
      },
      createEmblem: createAlertEmblem,
    }
  );

  assert.match(splash.className, /alert-splash--layout-card/);
  const tile = splash.children[0];
  assert.match(tile.className, /alert-image-fit--tile/);
  assert.equal(tile.style.backgroundImage, 'url("/overlay/assets/asset_tiles.png")');
  assert.equal(tile.children[0].src, "/overlay/assets/asset_tiles.png");
});

test("replaces a broken custom image with the matching built-in emblem", function () {
  const splash = createAlertSplash(
    fakeDocument,
    {
      source: "award",
      award_id: "mvp",
      award_name: "MVP",
      image_asset: "asset_missing.png",
    },
    {
      overlayAssetURL: (filename) => "/overlay/assets/" + filename,
      createEmblem: createAlertEmblem,
    }
  );
  const image = splash.children[0];
  image.listeners.error();
  assert.match(image.className, /alert-emblem--award/);
  assert.equal(image.attributes["data-emblem-symbol"], "laurel-star");
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
