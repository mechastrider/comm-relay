import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Live recap has a separate accessible constrained dialog", async function () {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const js = await readFile(new URL("./live-recap.js", import.meta.url), "utf8");
  assert.match(html, /id="live-recap-button"/);
  assert.match(html, /id="new-stream-button"/);
  assert.match(html, /id="live-recap-dialog" class="live-recap-dialog" aria-labelledby="live-recap-heading"/);
  assert.match(html, /id="live-recap-current-tab"[^>]*role="tab"/);
  assert.match(html, /id="live-recap-history-tab"[^>]*role="tab"/);
  assert.match(html, /id="live-recap-body"[^>]*aria-busy="false"/);
  assert.match(html, /id="live-recap-confirm"[^>]*hidden/);
  assert.match(html, /id="live-recap-retry"[^>]*hidden/);
  assert.match(js, /querySelectorAll\([^\n]+\)[\s\S]*?\.filter\(function \(element\) \{ return !element\.hidden && element\.getClientRects\(\)\.length > 0; \}\)/);
});
