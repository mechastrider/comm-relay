import assert from "node:assert/strict";
import test from "node:test";

import {
  activeAlertLayoutFromRoot,
  alertFontSizeForWidth,
  alertReferenceWidth,
  alertScaleForFontSize,
  isAlertSamplePreview,
} from "./alert-fit.js";

test("automatic alert font size follows width and layout reference", function () {
  assert.equal(
    alertFontSizeForWidth({ sizingMode: "auto", baseFontSizePx: 18, width: 400, layout: "banner" }),
    12
  );
  assert.equal(
    alertFontSizeForWidth({ sizingMode: "auto", baseFontSizePx: 18, width: 800, layout: "banner" }),
    18
  );
  assert.equal(
    alertFontSizeForWidth({ sizingMode: "auto", baseFontSizePx: 18, width: 1600, layout: "banner" }),
    36
  );
  assert.equal(
    alertFontSizeForWidth({ sizingMode: "auto", baseFontSizePx: 18, width: 520, layout: "card" }),
    18
  );
  assert.equal(
    alertFontSizeForWidth({ sizingMode: "fixed", baseFontSizePx: 24, width: 1600, layout: "banner" }),
    24
  );
});

test("fullscreen alerts on wide strip sources use banner scaling and height cap", function () {
  assert.equal(
    alertFontSizeForWidth({
      sizingMode: "auto",
      baseFontSizePx: 18,
      width: 1600,
      height: 400,
      layout: "fullscreen",
    }),
    45
  );
  assert.equal(
    alertFontSizeForWidth({
      sizingMode: "auto",
      baseFontSizePx: 18,
      width: 800,
      height: 200,
      layout: "fullscreen",
    }),
    18
  );
  assert.equal(
    alertFontSizeForWidth({
      sizingMode: "auto",
      baseFontSizePx: 18,
      width: 1600,
      height: 200,
      layout: "fullscreen",
    }),
    22
  );
});

test("alert scale token is relative to the 18px design baseline", function () {
  assert.equal(alertScaleForFontSize(18), 1);
  assert.equal(alertScaleForFontSize(36), 2);
});

test("banner reference width matches the wide strip preset", function () {
  assert.equal(alertReferenceWidth("banner"), 800);
});

test("active layout is read from the visible splash", function () {
  const root = {
    querySelector: function () {
      return { classList: { contains: function (name) { return name === "alert-splash--layout-fullscreen"; } } };
    },
  };
  assert.equal(activeAlertLayoutFromRoot(root), "fullscreen");
});

test("only explicit sample preview isolates alerts from live data", function () {
  assert.equal(isAlertSamplePreview(new URLSearchParams("preview=sample")), true);
  assert.equal(isAlertSamplePreview(new URLSearchParams("preview=white")), false);
});
