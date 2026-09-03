const STORED_ASSET_RE = /^[a-z0-9][a-z0-9._-]{0,127}\.(png|jpe?g|webp|gif|svg|mp3|wav)$/i;

export const CATALOG_LAYOUTS = ['card', 'banner', 'fullscreen'];

/** Keep in sync with web/alert/alert-render.js — admin cannot import overlay URLs from /js/. */
export function safeStoredAssetFilename(value) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (!candidate) {
    return '';
  }
  if (candidate.includes('..') || candidate.includes('://') || /[\\/]/.test(candidate)) {
    return '';
  }
  return STORED_ASSET_RE.test(candidate) ? candidate : '';
}

export function createCatalogMediaState(overrides = {}) {
  return {
    imageAsset: '',
    soundFile: '',
    soundVolume: 70,
    layout: 'card',
    previewAudio: null,
    previewCtx: null,
    ...overrides,
  };
}

export function normalizeCatalogLayout(layout) {
  const value = String(layout || '').trim().toLowerCase();
  return CATALOG_LAYOUTS.includes(value) ? value : 'card';
}

export function readCatalogMediaFromRecord(record) {
  const imageAsset = safeStoredAssetFilename(record?.image_asset || '');
  const soundFile = safeStoredAssetFilename(record?.sound_file || '');
  const soundVolume = Number.isFinite(Number(record?.sound_volume))
    ? Math.max(0, Math.min(100, Math.round(Number(record.sound_volume))))
    : 70;
  const layout = normalizeCatalogLayout(record?.layout);
  return { imageAsset, soundFile, soundVolume, layout };
}

export function catalogMediaPayload(state) {
  return {
    image_asset: state.imageAsset || '',
    sound_file: state.soundFile || '',
    sound_volume: state.soundVolume,
    layout: state.layout,
  };
}

export function overlayAssetPreviewURL(filename) {
  const safe = safeStoredAssetFilename(filename);
  return safe ? `/overlay/assets/${encodeURIComponent(safe)}` : '';
}
