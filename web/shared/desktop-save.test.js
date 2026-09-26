import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const save = readFileSync(new URL("./desktop-save.js", import.meta.url), "utf8");
const wailsMain = readFileSync(
  new URL("../../cmd/comm-relay-desktop/main_wails.go", import.meta.url),
  "utf8",
);

test("desktop save module is the only blob download entry point", function () {
  assert.match(save, /saveBlobWithDialog/);
  assert.match(save, /go\.main\.DesktopAPI/);
  assert.match(save, /link\.download = filename/);
  assert.match(save, /URL\.createObjectURL\(blob\)/);
});

test("wails desktop shell exposes recap save binding and loopback origins", function () {
  assert.match(wailsMain, /BindingsAllowedOrigins:\s*"http:\/\/127\.0\.0\.1:\*,http:\/\/localhost:\*"/);
  assert.match(wailsMain, /type DesktopAPI struct/);
  assert.match(wailsMain, /SavePNGFile/);
  assert.match(wailsMain, /desktopbridge\.WritePNGWithSaveDialog/);
});
