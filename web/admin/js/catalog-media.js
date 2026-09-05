import { deleteOverlayAsset, uploadOverlayAsset } from './overlay-asset-upload.js';
import {
  CATALOG_LAYOUTS,
  catalogMediaPayload,
  createCatalogMediaState,
  normalizeCatalogLayout,
  normalizeCatalogImageFit,
  normalizeCatalogImageSizePct,
  catalogImageFitCSSValue,
  overlayAssetPreviewURL,
  readCatalogMediaFromRecord,
} from './catalog-media-core.js';

export {
  CATALOG_LAYOUTS,
  catalogMediaPayload,
  createCatalogMediaState,
  normalizeCatalogLayout,
  normalizeCatalogImageFit,
  normalizeCatalogImageSizePct,
  catalogImageFitCSSValue,
  overlayAssetPreviewURL,
  readCatalogMediaFromRecord,
};

export async function uploadCatalogImage(file) {
  return uploadOverlayAsset(file, 'alert_image');
}

export async function uploadCatalogSound(file) {
  return uploadOverlayAsset(file, 'alert_sound');
}

export async function deleteCatalogAsset(filename, options) {
  return deleteOverlayAsset(filename, options);
}

export function stopCatalogPreview(state) {
  if (state.previewAudio) {
    state.previewAudio.pause();
    state.previewAudio.currentTime = 0;
    state.previewAudio = null;
  }
}

export async function playCatalogPreview(state, builtInSound, playBuiltIn) {
  stopCatalogPreview(state);
  const volume = Number.isFinite(Number(state.soundVolume)) ? Number(state.soundVolume) : 70;
  if (state.soundFile) {
    const url = overlayAssetPreviewURL(state.soundFile);
    if (!url) {
      return;
    }
    const audio = new Audio(url);
    audio.volume = Math.max(0, Math.min(100, volume)) / 100;
    state.previewAudio = audio;
    await audio.play();
    return;
  }
  if (builtInSound && typeof playBuiltIn === 'function') {
    await playBuiltIn(state, builtInSound, volume);
  }
}
