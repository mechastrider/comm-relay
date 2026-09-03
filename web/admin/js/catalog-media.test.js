import assert from 'node:assert/strict';
import test from 'node:test';

import {
  catalogMediaPayload,
  normalizeCatalogLayout,
  readCatalogMediaFromRecord,
} from './catalog-media-core.js';

test('normalizes catalog media defaults and payload', function () {
  const state = readCatalogMediaFromRecord({
    image_asset: 'asset_face.png',
    sound_file: 'asset_tone.wav',
    sound_volume: 42,
    layout: 'banner',
  });
  assert.equal(state.imageAsset, 'asset_face.png');
  assert.equal(state.soundFile, 'asset_tone.wav');
  assert.equal(state.soundVolume, 42);
  assert.equal(state.layout, 'banner');
  assert.deepEqual(catalogMediaPayload(state), {
    image_asset: 'asset_face.png',
    sound_file: 'asset_tone.wav',
    sound_volume: 42,
    layout: 'banner',
  });
  assert.equal(normalizeCatalogLayout(''), 'card');
});
