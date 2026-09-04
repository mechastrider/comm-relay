import assert from 'node:assert/strict';
import test from 'node:test';

function installUploadMocks(t) {
  t.mock.module('./api.js', {
    namedExports: {
      apiURL: (path) => 'http://test' + path,
      readJSON: async (response) => response._payload,
    },
  });
  t.mock.module('./i18n-ui.js', {
    namedExports: {
      t: (key) => key,
    },
  });
}

function tinyFile(name = 'icon.png', type = 'image/png') {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, { type });
}

function mockUploadFetch(t, onRequest) {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (_url, options) => {
    onRequest(options);
    return {
      ok: true,
      _payload: { filename: 'asset_test.png' },
    };
  };
}

function formDataKind(body) {
  assert.ok(body instanceof FormData);
  return body.get('kind');
}

test('uploadOverlayAsset sends panel kind by default', async (t) => {
  installUploadMocks(t);
  let capturedKind = null;
  mockUploadFetch(t, (options) => {
    capturedKind = formDataKind(options.body);
  });

  const { uploadOverlayAsset } = await import('./overlay-asset-upload.js');
  const filename = await uploadOverlayAsset(tinyFile());
  assert.equal(filename, 'asset_test.png');
  assert.equal(capturedKind, 'panel');
});

test('uploadOverlayAsset accepts object kind for alert_image', async (t) => {
  installUploadMocks(t);
  let capturedKind = null;
  mockUploadFetch(t, (options) => {
    capturedKind = formDataKind(options.body);
  });

  const { uploadOverlayAsset } = await import('./overlay-asset-upload.js');
  await uploadOverlayAsset(tinyFile('alert.png'), { kind: 'alert_image' });
  assert.equal(capturedKind, 'alert_image');
});

test('uploadCatalogImage sends alert_image kind', async (t) => {
  installUploadMocks(t);
  let capturedKind = null;
  mockUploadFetch(t, (options) => {
    capturedKind = formDataKind(options.body);
  });

  const { uploadCatalogImage } = await import('./catalog-media.js');
  await uploadCatalogImage(tinyFile('alert.png'));
  assert.equal(capturedKind, 'alert_image');
});

test('uploadCatalogSound sends alert_sound kind', async (t) => {
  installUploadMocks(t);
  let capturedKind = null;
  mockUploadFetch(t, (options) => {
    capturedKind = formDataKind(options.body);
  });

  const { uploadCatalogSound } = await import('./catalog-media.js');
  await uploadCatalogSound(tinyFile('alert.wav', 'audio/wav'));
  assert.equal(capturedKind, 'alert_sound');
});

test('uploadOverlayAsset rejects unknown kinds before upload', async (t) => {
  installUploadMocks(t);
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return { ok: true, _payload: { filename: 'asset_test.png' } };
  };

  const { uploadOverlayAsset } = await import('./overlay-asset-upload.js');
  await assert.rejects(() => uploadOverlayAsset(tinyFile(), 'banner'));
  assert.equal(fetchCalls, 0);
});

test('mapOverlayAssetUploadError describes formats for the selected catalog media kind', async (t) => {
  installUploadMocks(t);
  const { mapOverlayAssetUploadError } = await import('./overlay-asset-upload.js');
  assert.equal(
    mapOverlayAssetUploadError('file type is not allowed', 'alert_image'),
    'catalog.assetImageTypeNotAllowed'
  );
  assert.equal(
    mapOverlayAssetUploadError('file type is not allowed', 'alert_sound'),
    'catalog.assetSoundTypeNotAllowed'
  );
  assert.equal(
    mapOverlayAssetUploadError('file type is not allowed', 'panel'),
    'obs.assetTypeNotAllowed'
  );
});

test('deleteOverlayAsset uses the reference-safe POST action', async (t) => {
  installUploadMocks(t);
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  let capturedURL = '';
  let capturedOptions = null;
  globalThis.fetch = async (url, options) => {
    capturedURL = url;
    capturedOptions = options;
    return {
      ok: true,
      _payload: { deleted: true },
    };
  };

  const { deleteOverlayAsset } = await import('./overlay-asset-upload.js');
  assert.equal(await deleteOverlayAsset('asset_test.png', { keepalive: true }), true);
  assert.equal(capturedURL, 'http://test/api/overlay/assets/delete');
  assert.equal(capturedOptions.method, 'POST');
  assert.equal(capturedOptions.keepalive, true);
  assert.deepEqual(JSON.parse(capturedOptions.body), { filename: 'asset_test.png' });
});
