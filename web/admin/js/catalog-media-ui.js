import { t } from "./i18n-ui.js";
import {
  catalogMediaPayload,
  catalogImageFitCSSValue,
  createCatalogMediaState,
  deleteCatalogAsset,
  normalizeCatalogLayout,
  normalizeCatalogImageFit,
  normalizeCatalogImageSizePct,
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
 * @param {HTMLSelectElement | null} options.imageFitInput
 * @param {HTMLElement | null} options.imageFitError
 * @param {HTMLInputElement | null} options.imageSizeInput
 * @param {HTMLOutputElement | null} options.imageSizeValue
 * @param {HTMLElement | null} options.imageSizeError
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
  let persistedImageAsset = "";
  let persistedSoundFile = "";
  const provisionalAssets = new Set();

  function setFieldError(control, element, message) {
    if (!element) {
      return;
    }
    element.textContent = message || "";
    element.hidden = !message;
    if (!control) {
      return;
    }
    if (message) {
      control.setAttribute("aria-invalid", "true");
      if (element.id) {
        control.setAttribute("aria-describedby", element.id);
      }
    } else {
      control.removeAttribute("aria-invalid");
      control.removeAttribute("aria-describedby");
    }
  }

  function setLayoutError(message) {
    const inputs = document.querySelectorAll('input[name="' + options.layoutName + '"]');
    setFieldError(inputs[0] || null, options.layoutError, message);
    inputs.forEach(function (input, index) {
      if (index === 0) {
        return;
      }
      if (message) {
        input.setAttribute("aria-invalid", "true");
        if (options.layoutError?.id) {
          input.setAttribute("aria-describedby", options.layoutError.id);
        }
      } else {
        input.removeAttribute("aria-invalid");
        input.removeAttribute("aria-describedby");
      }
    });
  }

  function requestAssetCleanup(filename, cleanupOptions) {
    if (!filename) {
      return;
    }
    deleteCatalogAsset(filename, cleanupOptions).catch(function () {
      // A shared or already-removed asset is safe to keep/ignore here.
    });
  }

  function abandonProvisionalAsset(filename, cleanupOptions) {
    if (!filename || !provisionalAssets.has(filename)) {
      return;
    }
    provisionalAssets.delete(filename);
    requestAssetCleanup(filename, cleanupOptions);
  }

  function abandonPendingUploads(cleanupOptions) {
    Array.from(provisionalAssets).forEach(function (filename) {
      provisionalAssets.delete(filename);
      requestAssetCleanup(filename, cleanupOptions);
    });
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
    const isTile = state.imageFit === "tile";
    const image = document.createElement(isTile ? "div" : "img");
    image.className = "catalog-media-preview__image";
    const imageURL = overlayAssetPreviewURL(state.imageAsset);
    if (isTile) {
      image.classList.add("catalog-media-preview__image--tile");
      image.style.backgroundImage = 'url("' + imageURL + '")';
    } else {
      image.src = imageURL;
      image.alt = "";
      image.style.objectFit = catalogImageFitCSSValue(state.imageFit);
    }
    const scale = normalizeCatalogImageSizePct(state.imageSizePct) / 100;
    image.style.width = String(Math.round(72 * scale)) + "px";
    image.style.height = String(Math.round(72 * scale)) + "px";
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
    state.layout = normalizeCatalogLayout(selected ? selected.value : "fullscreen");
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

  function updateImageSizeLabel() {
    if (options.imageSizeValue) {
      options.imageSizeValue.textContent = String(state.imageSizePct) + "%";
    }
  }

  function writeImageSizeToForm(imageSizePct) {
    const value = normalizeCatalogImageSizePct(imageSizePct);
    state.imageSizePct = value;
    if (options.imageSizeInput) {
      options.imageSizeInput.value = String(value);
    }
    updateImageSizeLabel();
  }

  function readImageSizeFromForm() {
    if (options.imageSizeInput) {
      state.imageSizePct = normalizeCatalogImageSizePct(options.imageSizeInput.value);
      updateImageSizeLabel();
    }
  }

  function writeImageFitToForm(imageFit) {
    if (options.imageFitInput) {
      options.imageFitInput.value = normalizeCatalogImageFit(imageFit);
    }
  }

  function readImageFitFromForm() {
    if (options.imageFitInput) {
      state.imageFit = normalizeCatalogImageFit(options.imageFitInput.value);
    }
  }

  function fillFromRecord(record) {
    stopCatalogPreview(state);
    abandonPendingUploads();
    const media = readCatalogMediaFromRecord(record);
    persistedImageAsset = media.imageAsset;
    persistedSoundFile = media.soundFile;
    state = Object.assign(createCatalogMediaState(), media);
    if (options.soundVolumeInput) {
      options.soundVolumeInput.value = String(state.soundVolume);
    }
    writeLayoutToForm(state.layout);
    writeImageFitToForm(state.imageFit);
    writeImageSizeToForm(state.imageSizePct);
    updateImagePreview();
    updateVolumeLabel();
    clearFieldErrors();
  }

  function reset() {
    fillFromRecord({});
  }

  function clearFieldErrors() {
    setFieldError(options.imageInput, options.imageError, "");
    setFieldError(options.imageFitInput, options.imageFitError, "");
    setFieldError(options.imageSizeInput, options.imageSizeError, "");
    setFieldError(options.soundFileInput, options.soundFileError, "");
    setFieldError(options.soundVolumeInput, options.soundVolumeError, "");
    setLayoutError("");
  }

  function applyFieldErrors(fields) {
    if (!fields || typeof fields !== "object") {
      return;
    }
    if (fields.image_asset) {
      setFieldError(options.imageInput, options.imageError, fields.image_asset);
    }
    if (fields.image_fit) {
      setFieldError(options.imageFitInput, options.imageFitError, fields.image_fit);
    }
    if (fields.image_size_pct) {
      setFieldError(options.imageSizeInput, options.imageSizeError, fields.image_size_pct);
    }
    if (fields.sound_file) {
      setFieldError(options.soundFileInput, options.soundFileError, fields.sound_file);
    }
    if (fields.sound_volume) {
      setFieldError(options.soundVolumeInput, options.soundVolumeError, fields.sound_volume);
    }
    if (fields.layout) {
      setLayoutError(fields.layout);
    }
  }

  function readPayload() {
    readLayoutFromForm();
    readImageFitFromForm();
    readImageSizeFromForm();
    if (options.soundVolumeInput) {
      state.soundVolume = Number(options.soundVolumeInput.value);
    }
    return catalogMediaPayload(state);
  }

  async function handleImageUpload(file) {
    setFieldError(options.imageInput, options.imageError, "");
    try {
      const previous = state.imageAsset;
      const uploaded = await uploadCatalogImage(file);
      state.imageAsset = uploaded;
      if (uploaded !== persistedImageAsset) {
        provisionalAssets.add(uploaded);
      }
      if (previous !== uploaded && previous !== persistedImageAsset) {
        abandonProvisionalAsset(previous);
      }
      updateImagePreview();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("obs.assetUploadFailed");
      setFieldError(options.imageInput, options.imageError, message);
    } finally {
      if (options.imageInput) {
        options.imageInput.value = "";
      }
    }
  }

  async function handleSoundUpload(file) {
    setFieldError(options.soundFileInput, options.soundFileError, "");
    try {
      const previous = state.soundFile;
      const uploaded = await uploadCatalogSound(file);
      state.soundFile = uploaded;
      if (uploaded !== persistedSoundFile) {
        provisionalAssets.add(uploaded);
      }
      if (previous !== uploaded && previous !== persistedSoundFile) {
        abandonProvisionalAsset(previous);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("obs.assetUploadFailed");
      setFieldError(options.soundFileInput, options.soundFileError, message);
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
      abandonProvisionalAsset(state.imageAsset);
      state.imageAsset = "";
      updateImagePreview();
      setFieldError(options.imageInput, options.imageError, "");
    });
    options.imageFitInput?.addEventListener("change", function () {
      readImageFitFromForm();
      updateImagePreview();
      setFieldError(options.imageFitInput, options.imageFitError, "");
    });
    options.imageSizeInput?.addEventListener("input", function () {
      readImageSizeFromForm();
      updateImagePreview();
      setFieldError(options.imageSizeInput, options.imageSizeError, "");
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
      abandonProvisionalAsset(state.soundFile);
      state.soundFile = "";
      setFieldError(options.soundFileInput, options.soundFileError, "");
    });
    options.soundVolumeInput?.addEventListener("input", function () {
      state.soundVolume = Number(options.soundVolumeInput?.value || 70);
      updateVolumeLabel();
      setFieldError(options.soundVolumeInput, options.soundVolumeError, "");
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
        setLayoutError("");
      });
    });
    window.addEventListener("beforeunload", function () {
      abandonPendingUploads({ keepalive: true });
    });
  }

  function commitSavedRecord(record) {
    const media = readCatalogMediaFromRecord(record);
    const previousImage = persistedImageAsset;
    const previousSound = persistedSoundFile;

    provisionalAssets.delete(media.imageAsset);
    provisionalAssets.delete(media.soundFile);
    persistedImageAsset = media.imageAsset;
    persistedSoundFile = media.soundFile;

    if (previousImage && previousImage !== persistedImageAsset) {
      requestAssetCleanup(previousImage);
    }
    if (previousSound && previousSound !== persistedSoundFile) {
      requestAssetCleanup(previousSound);
    }
    abandonPendingUploads();
  }

  function releaseSavedAssets() {
    const image = persistedImageAsset;
    const sound = persistedSoundFile;
    persistedImageAsset = "";
    persistedSoundFile = "";
    requestAssetCleanup(image);
    if (sound !== image) {
      requestAssetCleanup(sound);
    }
    abandonPendingUploads();
  }

  return {
    bind,
    fillFromRecord,
    reset,
    readPayload,
    applyFieldErrors,
    clearFieldErrors,
    commitSavedRecord,
    releaseSavedAssets,
    abandonPendingUploads,
    stopPreview: function () {
      stopCatalogPreview(state);
    },
  };
}
