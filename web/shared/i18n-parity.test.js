import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const en = (await import(pathToFileURL(join(here, "locales", "en.js")).href)).default;
const ru = (await import(pathToFileURL(join(here, "locales", "ru.js")).href)).default;

const enKeys = Object.keys(en).sort();
const ruKeys = Object.keys(ru).sort();

assert.deepEqual(ruKeys, enKeys, "Russian locale keys must match English");

for (const key of enKeys) {
  assert.equal(typeof en[key], "string", "en[" + key + "] must be a string");
  assert.equal(typeof ru[key], "string", "ru[" + key + "] must be a string");
  assert.notEqual(en[key].trim(), "", "en[" + key + "] must not be empty");
  assert.notEqual(ru[key].trim(), "", "ru[" + key + "] must not be empty");
}

console.log("i18n parity OK (" + String(enKeys.length) + " keys)");
