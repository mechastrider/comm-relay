import assert from "node:assert/strict";
import test from "node:test";

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName;
    this.children = [];
    this.className = "";
    this._textContent = "";
    this.attributes = {};
    this.listeners = {};
    this.style = {};
    this.value = "";
    this.checked = false;
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
    if (name === "class") {
      this.className = String(value);
    }
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  addEventListener(name, listener) {
    this.listeners[name] = listener;
  }
}

test("catalog image preview restores the matching built-in emblem after Clear", async function (t) {
  t.mock.module("./i18n-ui.js", {
    exports: { t: (key) => key },
  });
  t.mock.module("./catalog-media.js", {
    exports: {
      catalogMediaPayload: (state) => state,
      catalogImageFitCSSValue: (fit) => fit || "contain",
      createCatalogMediaState: () => ({
        imageAsset: "",
        soundFile: "",
        soundVolume: 70,
        layout: "fullscreen",
        imageFit: "contain",
        imageSizePct: 100,
      }),
      deleteCatalogAsset: async () => true,
      normalizeCatalogLayout: (value) => value || "fullscreen",
      normalizeCatalogImageFit: (value) => value || "contain",
      normalizeCatalogImageSizePct: (value) => Number(value) || 100,
      overlayAssetPreviewURL: (filename) => "/overlay/assets/" + filename,
      playCatalogPreview: async () => {},
      readCatalogMediaFromRecord: (record) => ({
        imageAsset: record.image_asset || "",
        soundFile: record.sound_file || "",
        soundVolume: 70,
        layout: "fullscreen",
        imageFit: "contain",
        imageSizePct: 100,
      }),
      stopCatalogPreview: () => {},
      uploadCatalogImage: async () => "",
      uploadCatalogSound: async () => "",
    },
  });

  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalInput = globalThis.HTMLInputElement;
  const layout = new FakeElement("input");
  layout.value = "fullscreen";
  layout.checked = true;
  const documentRef = {
    createElement: (tagName) => new FakeElement(tagName),
    createElementNS: (_namespace, tagName) => new FakeElement(tagName),
    querySelector: () => layout,
    querySelectorAll: () => [],
  };
  globalThis.document = documentRef;
  globalThis.window = { addEventListener: () => {} };
  globalThis.HTMLInputElement = FakeElement;
  t.after(function () {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.HTMLInputElement = originalInput;
  });

  const { createCatalogMediaController } = await import("./catalog-media-ui.js");
  const preview = new FakeElement();
  const clear = new FakeElement("button");
  const controller = createCatalogMediaController({
    imagePreview: preview,
    imageInput: null,
    imageClear: clear,
    imageError: null,
    imageFitInput: null,
    imageFitError: null,
    imageSizeInput: null,
    imageSizeValue: null,
    imageSizeError: null,
    soundFileInput: null,
    soundFileClear: null,
    soundFileError: null,
    soundVolumeInput: null,
    soundVolumeValue: null,
    soundVolumeError: null,
    soundPlay: null,
    soundStop: null,
    builtInSoundInput: null,
    layoutName: "command-layout",
    layoutError: null,
    graphicKind: "command",
    graphicIdentity: (record) => ({ identifier: record.trigger, label: record.trigger }),
  });
  controller.bind();
  controller.fillFromRecord({ trigger: "gg", image_asset: "asset_custom.png" });
  assert.equal(preview.children[0].tagName, "img");

  clear.listeners.click();
  assert.match(preview.children[0].className, /alert-emblem--command/);
  assert.equal(preview.children[0].attributes["data-emblem-symbol"], "flags");
});
