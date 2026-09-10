import assert from "node:assert/strict";
import test from "node:test";

import {
  alertsPreviewQuery,
  normalizeAlertsSurfaceOverride,
  resolveAlertsFormValues,
  withAlertsPresentation,
} from "./alerts-presentation.js";

test("resolveAlertsFormValues defaults to automatic sizing", function () {
  assert.deepEqual(resolveAlertsFormValues({}, 18), {
    sizing_mode: "auto",
    font_size_px: 18,
    image_size_pct: 100,
  });
  assert.equal(resolveAlertsFormValues({ font_size_px: 24 }, 18).sizing_mode, "fixed");
});

test("withAlertsPresentation stores fixed sizing explicitly", function () {
  const next = withAlertsPresentation(
    {},
    { sizing_mode: "fixed", font_size_px: 24, image_size_pct: 150, inherited_font_size_px: 18 },
    { sizing: true, font: true, imageSize: true }
  );
  assert.equal(next.alerts.sizing_mode, "fixed");
  assert.equal(next.alerts.font_size_px, 24);
  assert.equal(next.alerts.image_size_pct, 150);
});

test("normalizeAlertsSurfaceOverride keeps explicit automatic sizing", function () {
  assert.deepEqual(normalizeAlertsSurfaceOverride({ sizing_mode: "auto" }), { sizing_mode: "auto" });
});

test("alertsPreviewQuery exposes base font for automatic preview", function () {
  assert.deepEqual(alertsPreviewQuery({ sizing_mode: "auto", font_size_px: 20, image_size_pct: 100 }), {
    sizing_mode: "auto",
    font_size_px: undefined,
    base_font_size_px: "20",
    image_size_pct: "100",
  });
});
