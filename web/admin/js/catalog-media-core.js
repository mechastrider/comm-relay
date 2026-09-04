const STORED_IMAGE_ASSET_RE = /^[a-z0-9][a-z0-9._-]{0,127}\.(png|jpe?g|webp)$/i;
const STORED_SOUND_ASSET_RE = /^[a-z0-9][a-z0-9._-]{0,127}\.(mp3|wav)$/i;

export const CATALOG_LAYOUTS = ['card', 'banner', 'fullscreen'];
export const CATALOG_IMAGE_FITS = ['cover', 'contain', 'fill', 'tile'];
export const CATALOG_IMAGE_SIZE_MIN = 25;
export const CATALOG_IMAGE_SIZE_MAX = 300;
export const CATALOG_IMAGE_SIZE_DEFAULT = 100;

function safeStoredFilename(value, pattern) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (!candidate) {
    return '';
  }
  if (candidate.includes('..') || candidate.includes('://') || /[\\/]/.test(candidate)) {
    return '';
  }
  return pattern.test(candidate) ? candidate : '';
}

/** Keep in sync with web/alert/alert-render.js — admin cannot import overlay URLs from /js/. */
export function safeStoredImageAssetFilename(value) {
  return safeStoredFilename(value, STORED_IMAGE_ASSET_RE);
}

export function safeStoredSoundAssetFilename(value) {
  return safeStoredFilename(value, STORED_SOUND_ASSET_RE);
}

export function createCatalogMediaState(overrides = {}) {
  return {
    imageAsset: '',
    soundFile: '',
    soundVolume: 70,
    layout: 'fullscreen',
    imageFit: 'contain',
    imageSizePct: CATALOG_IMAGE_SIZE_DEFAULT,
    previewAudio: null,
    previewCtx: null,
    ...overrides,
  };
}

export function normalizeCatalogLayout(layout) {
  const value = String(layout || '').trim().toLowerCase();
  return CATALOG_LAYOUTS.includes(value) ? value : 'fullscreen';
}

export function normalizeCatalogImageFit(fit) {
  const value = String(fit || '').trim().toLowerCase();
  return CATALOG_IMAGE_FITS.includes(value) ? value : 'contain';
}

export function normalizeCatalogImageSizePct(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return CATALOG_IMAGE_SIZE_DEFAULT;
  }
  return Math.max(
    CATALOG_IMAGE_SIZE_MIN,
    Math.min(CATALOG_IMAGE_SIZE_MAX, Math.round(parsed))
  );
}

export function catalogImageFitCSSValue(fit) {
  const normalized = normalizeCatalogImageFit(fit);
  if (normalized === 'fill') {
    return 'fill';
  }
  if (normalized === 'tile') {
    return 'contain';
  }
  return normalized;
}

export function readCatalogMediaFromRecord(record) {
  const imageAsset = safeStoredImageAssetFilename(record?.image_asset || '');
  const soundFile = safeStoredSoundAssetFilename(record?.sound_file || '');
  const soundVolume = Number.isFinite(Number(record?.sound_volume))
    ? Math.max(0, Math.min(100, Math.round(Number(record.sound_volume))))
    : 70;
  const layout = normalizeCatalogLayout(record?.layout);
  const imageFit = normalizeCatalogImageFit(record?.image_fit);
  const imageSizePct = normalizeCatalogImageSizePct(record?.image_size_pct);
  return { imageAsset, soundFile, soundVolume, layout, imageFit, imageSizePct };
}

export function catalogMediaPayload(state) {
  return {
    image_asset: state.imageAsset || '',
    sound_file: state.soundFile || '',
    sound_volume: state.soundVolume,
    layout: state.layout,
    image_fit: state.imageFit,
    image_size_pct: state.imageSizePct,
  };
}

export function overlayAssetPreviewURL(filename) {
  const safe =
    safeStoredImageAssetFilename(filename) || safeStoredSoundAssetFilename(filename);
  return safe ? `/overlay/assets/${encodeURIComponent(safe)}` : '';
}
