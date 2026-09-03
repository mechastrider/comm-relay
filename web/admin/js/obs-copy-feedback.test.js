import assert from "node:assert/strict";
import test from "node:test";

import { localizedCopyLabel } from "./obs-copy-feedback.js";

test("copy feedback reset reads the locale at reset time", function () {
  let locale = "en";
  const translate = function (key) {
    assert.equal(key, "obs.copyUrl");
    return locale === "en" ? "Copy URL" : "Копировать URL";
  };

  assert.equal(localizedCopyLabel(translate), "Copy URL");
  locale = "ru";
  assert.equal(localizedCopyLabel(translate), "Копировать URL");
});
