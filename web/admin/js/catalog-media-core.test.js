import test from 'node:test';
import assert from 'node:assert/strict';
import {
  catalogMediaPayload,
  createCatalogMediaState,
  normalizeCatalogLayout,
  normalizeCatalogImageSizePct,
  overlayAssetPreviewURL,
  readCatalogMediaFromRecord,
} from './catalog-media-core.js';

test('normalizeCatalogLayout defaults unknown to fullscreen', () => {
  assert.equal(normalizeCatalogLayout(''), 'fullscreen');
  assert.equal(normalizeCatalogLayout('banner'), 'banner');
  assert.equal(normalizeCatalogLayout('weird'), 'fullscreen');
});

test('normalizeCatalogImageSizePct defaults unknown to 100', () => {
  assert.equal(normalizeCatalogImageSizePct(''), 100);
  assert.equal(normalizeCatalogImageSizePct('180'), 180);
  assert.equal(normalizeCatalogImageSizePct('999'), 300);
});

test('readCatalogMediaFromRecord rejects unsafe filenames', () => {
  const state = readCatalogMediaFromRecord({
    image_asset: 'https://evil/x.png',
    sound_file: '../tone.mp3',
    sound_volume: 120,
    layout: 'fullscreen',
  });
  assert.equal(state.imageAsset, '');
  assert.equal(state.soundFile, '');
  assert.equal(state.soundVolume, 100);
  assert.equal(state.layout, 'fullscreen');
});

test('catalogMediaPayload round-trips media fields', () => {
  const state = createCatalogMediaState({
    imageAsset: 'asset_ab.png',
    soundFile: 'asset_cd.mp3',
    soundVolume: 55,
    layout: 'banner',
  });
  assert.deepEqual(catalogMediaPayload(state), {
    image_asset: 'asset_ab.png',
    sound_file: 'asset_cd.mp3',
    sound_volume: 55,
    layout: 'banner',
    image_fit: 'contain',
    image_size_pct: 100,
  });
});

test('overlayAssetPreviewURL only allows stored filenames', () => {
  assert.equal(overlayAssetPreviewURL('asset_x.png'), '/overlay/assets/asset_x.png');
  assert.equal(overlayAssetPreviewURL('asset_x.mp3'), '/overlay/assets/asset_x.mp3');
  assert.equal(overlayAssetPreviewURL('asset_x.gif'), '');
  assert.equal(overlayAssetPreviewURL('http://x'), '');
});
