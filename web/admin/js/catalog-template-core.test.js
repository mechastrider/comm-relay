import assert from "node:assert/strict";
import {
  SPLASH_VARIABLES,
  SPLASH_VARIABLE_TOOLTIP_I18N,
  substituteSplashTemplate,
  insertSplashVariable,
} from "./catalog-template-core.js";

assert.deepEqual(SPLASH_VARIABLES, [
  "{viewer}",
  "{streamer}",
  "{points}",
  "{message}",
]);

SPLASH_VARIABLES.forEach(function (token) {
  assert.ok(SPLASH_VARIABLE_TOOLTIP_I18N[token], `missing tooltip i18n for ${token}`);
});

assert.equal(
  substituteSplashTemplate("Hi {viewer} from {streamer}: {message} +{points}", {
    viewer: "Alice",
    streamer: "Jake",
    message: "!gg",
    points: 0,
  }),
  "Hi Alice from Jake: !gg +0"
);

assert.equal(
  substituteSplashTemplate("Advice for {viewer}: {message}", {
    viewer: "Bob",
    message: "nice catch",
    points: 50,
  }),
  "Advice for Bob: nice catch"
);

assert.equal(substituteSplashTemplate("Unknown {foo}", { viewer: "Alice" }), "Unknown {foo}");

assert.equal(
  substituteSplashTemplate("From {streamer}", { streamer: "" }),
  "From "
);

const input = {
  value: "Hello ",
  selectionStart: 6,
  selectionEnd: 6,
  setSelectionRange(start, end) {
    this.selectionStart = start;
    this.selectionEnd = end;
  },
};
insertSplashVariable(/** @type {HTMLInputElement} */ (input), "{viewer}");
assert.equal(input.value, "Hello {viewer}");
assert.equal(input.selectionStart, 14);

console.log("catalog-template OK");
