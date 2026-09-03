import test from 'node:test';
import assert from 'node:assert/strict';
import {
  catalogMediaPayload,
  createCatalogMediaState,
  normalizeCatalogLayout,
  overlayAssetPreviewURL,
  readCatalogMediaFromRecord,
} from './catalog-media-core.js';

test('normalizeCatalogLayout defaults unknown to card', () => {
  assert.equal(normalizeCatalogLayout(''), 'card');
  assert.equal(normalizeCatalogLayout('banner'), 'banner');
  assert.equal(normalizeCatalogLayout('weird'), 'card');
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
  });
});

test('overlayAssetPreviewURL only allows stored filenames', () => {
  assert.equal(overlayAssetPreviewURL('asset_x.png'), '/overlay/assets/asset_x.png');
  assert.equal(overlayAssetPreviewURL('http://x'), '');
});
