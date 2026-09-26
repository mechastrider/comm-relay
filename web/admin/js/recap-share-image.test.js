import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const share = readFileSync(new URL("./recap-share-image.js", import.meta.url), "utf8");
const render = readFileSync(new URL("../../recap/recap-render.js", import.meta.url), "utf8");

test("share card encode fills an opaque canvas and reuses recap renderer", function () {
  assert.match(share, /OPAQUE_BACKDROP = "rgb\(12, 18, 26\)"/);
  assert.match(share, /ctx\.fillRect\(0, 0, SHARE_WIDTH, SHARE_HEIGHT\)/);
  assert.match(share, /from "\/overlay\/recap\/recap-render\.js\?v=3"/);
  assert.match(share, /renderRecap\(root, snapshot/);
  assert.match(share, /foreignObject/);
  assert.match(share, /data:image\/svg\+xml;charset=utf-8/);
  assert.match(share, /animation:none!important/);
  assert.match(share, /toDataURL\("image\/png"\)/);
  assert.match(share, /readCachedLocale/);
  assert.match(share, /html\\s\*,\\s\*body/);
  assert.doesNotMatch(share, /document\.body\.appendChild\(mount\)/);
  assert.doesNotMatch(share, /createObjectURL\(svg/);
  assert.match(share, /toBlob/);
  assert.match(share, /desktop-save\.js/);
  assert.doesNotMatch(share, /innerHTML/);
  assert.doesNotMatch(share, /html2canvas/);
  assert.match(render, /\.textContent = String\(value\)/);
});
