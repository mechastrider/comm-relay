import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const markup = await readFile(join(here, "..", "index.html"), "utf8");
const source = await readFile(join(here, "greetings-catalog.js"), "utf8");

assert.match(markup, /id="audience-greetings-tab"/, "Audience must expose a Greetings tab");
assert.match(markup, /id="greetings-list"[^>]*role="listbox"/, "Greeting catalog must be a listbox");
assert.match(markup, /id="greetings-test"/, "Greeting catalog must provide Test");
assert.doesNotMatch(markup, /greetings-(?:create|delete)/, "Fixed greetings must not expose create/delete controls");
assert.match(source, /\["\{viewer\}", "\{streamer\}", "\{message\}"\]/, "Greeting variables must omit points");
assert.match(source, /window\.confirm\(t\("greetings\.discardConfirm"\)\)/, "Changing a dirty greeting must be protected");

console.log("greetings-markup OK");
