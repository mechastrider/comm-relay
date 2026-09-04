import { t } from "./i18n-ui.js";
import {
  catalogMediaPayload,
  createCatalogMediaState,
  normalizeCatalogLayout,
  overlayAssetPreviewURL,
  playCatalogPreview,
  readCatalogMediaFromRecord,
  stopCatalogPreview,
  uploadCatalogImage,
  uploadCatalogSound,
} from "./catalog-media.js";

async function playBuiltInPreview(state, sound, volume) {
  const module = await import("/overlay/alert/alert-sound.js?v=2");
  const ctx = await module.ensureAudioContext(state.previewCtx);
  state.previewCtx = ctx;
  module.playAlertTone(ctx, sound, ctx.currentTime, volume);
}

/**
 * @param {object} options
 * @param {HTMLElement | null} options.imagePreview
 * @param {HTMLInputElement | null} options.imageInput
 * @param {HTMLButtonElement | null} options.imageClear
 * @param {HTMLElement | null} options.imageError
 * @param {HTMLInputElement | null} options.soundFileInput
 * @param {HTMLButtonElement | null} options.soundFileClear
 * @param {HTMLElement | null} options.soundFileError
 * @param {HTMLInputElement | null} options.soundVolumeInput
 * @param {HTMLOutputElement | null} options.soundVolumeValue
 * @param {HTMLElement | null} options.soundVolumeError
 * @param {HTMLButtonElement | null} options.soundPlay
 * @param {HTMLButtonElement | null} options.soundStop
 * @param {HTMLSelectElement | null} options.builtInSoundInput
 * @param {string} options.layoutName
 * @param {HTMLElement | null} options.layoutError
 */
export function createCatalogMediaController(options) {
  /** @type {ReturnType<typeof createCatalogMediaState>} */
  let state = createCatalogMediaState();

  function setFieldError(element, message) {
    if (!element) {
      return;
    }
    element.textContent = message || "";
    element.hidden = !message;
  }

  function updateImagePreview() {
    if (!options.imagePreview) {
      return;
    }
    options.imagePreview.textContent = "";
    if (!state.imageAsset) {
      const placeholder = document.createElement("span");
      placeholder.className = "catalog-media-preview__placeholder";
      placeholder.textContent = t("catalog.imagePlaceholder");
      options.imagePreview.append(placeholder);
      return;
    }
    const image = document.createElement("img");
    image.className = "catalog-media-preview__image";
    image.src = overlayAssetPreviewURL(state.imageAsset);
    image.alt = "";
    options.imagePreview.append(image);
  }

  function updateVolumeLabel() {
    if (options.soundVolumeValue) {
      options.soundVolumeValue.textContent = String(state.soundVolume) + "%";
    }
  }

  function readLayoutFromForm() {
    const selected = document.querySelector(
      'input[name="' + options.layoutName + '"]:checked'
    );
    state.layout = normalizeCatalogLayout(selected ? selected.value : "card");
  }

  function writeLayoutToForm(layout) {
    const value = normalizeCatalogLayout(layout);
    const input = document.querySelector(
      'input[name="' + options.layoutName + '"][value="' + value + '"]'
    );
    if (input instanceof HTMLInputElement) {
      input.checked = true;
    }
  }

  function fillFromRecord(record) {
    stopCatalogPreview(state);
    state = Object.assign(createCatalogMediaState(), readCatalogMediaFromRecord(record));
    if (options.soundVolumeInput) {
      options.soundVolumeInput.value = String(state.soundVolume);
    }
    writeLayoutToForm(state.layout);
    updateImagePreview();
    updateVolumeLabel();
    clearFieldErrors();
  }

  function reset() {
    fillFromRecord({});
  }

  function clearFieldErrors() {
    setFieldError(options.imageError, "");
    setFieldError(options.soundFileError, "");
    setFieldError(options.soundVolumeError, "");
    setFieldError(options.layoutError, "");
  }

  function applyFieldErrors(fields) {
    if (!fields || typeof fields !== "object") {
      return;
    }
    if (fields.image_asset) {
      setFieldError(options.imageError, fields.image_asset);
    }
    if (fields.sound_file) {
      setFieldError(options.soundFileError, fields.sound_file);
    }
    if (fields.sound_volume) {
      setFieldError(options.soundVolumeError, fields.sound_volume);
    }
    if (fields.layout) {
      setFieldError(options.layoutError, fields.layout);
    }
  }

  function readPayload() {
    readLayoutFromForm();
    if (options.soundVolumeInput) {
      state.soundVolume = Number(options.soundVolumeInput.value);
    }
    return catalogMediaPayload(state);
  }

  async function handleImageUpload(file) {
    setFieldError(options.imageError, "");
    try {
      state.imageAsset = await uploadCatalogImage(file);
      updateImagePreview();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("obs.assetUploadFailed");
      setFieldError(options.imageError, message);
    } finally {
      if (options.imageInput) {
        options.imageInput.value = "";
      }
    }
  }

  async function handleSoundUpload(file) {
    setFieldError(options.soundFileError, "");
    try {
      state.soundFile = await uploadCatalogSound(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("obs.assetUploadFailed");
      setFieldError(options.soundFileError, message);
    } finally {
      if (options.soundFileInput) {
        options.soundFileInput.value = "";
      }
    }
  }

  function bind() {
    options.imageInput?.addEventListener("change", function () {
      const file = options.imageInput?.files?.[0];
      if (file) {
        handleImageUpload(file).catch(function () {
          /* field error */
        });
      }
    });
    options.imageClear?.addEventListener("click", function () {
      state.imageAsset = "";
      updateImagePreview();
      setFieldError(options.imageError, "");
    });
    options.soundFileInput?.addEventListener("change", function () {
      const file = options.soundFileInput?.files?.[0];
      if (file) {
        handleSoundUpload(file).catch(function () {
          /* field error */
        });
      }
    });
    options.soundFileClear?.addEventListener("click", function () {
      stopCatalogPreview(state);
      state.soundFile = "";
      setFieldError(options.soundFileError, "");
    });
    options.soundVolumeInput?.addEventListener("input", function () {
      state.soundVolume = Number(options.soundVolumeInput?.value || 70);
      updateVolumeLabel();
      setFieldError(options.soundVolumeError, "");
    });
    options.soundPlay?.addEventListener("click", function () {
      readLayoutFromForm();
      if (options.soundVolumeInput) {
        state.soundVolume = Number(options.soundVolumeInput.value);
      }
      playCatalogPreview(state, options.builtInSoundInput?.value || "", playBuiltInPreview).catch(function () {
        /* preview only */
      });
    });
    options.soundStop?.addEventListener("click", function () {
      stopCatalogPreview(state);
    });
    document.querySelectorAll('input[name="' + options.layoutName + '"]').forEach(function (input) {
      input.addEventListener("change", function () {
        readLayoutFromForm();
        setFieldError(options.layoutError, "");
      });
    });
  }

  return {
    bind,
    fillFromRecord,
    reset,
    readPayload,
    applyFieldErrors,
    clearFieldErrors,
    stopPreview: function () {
      stopCatalogPreview(state);
    },
  };
}
