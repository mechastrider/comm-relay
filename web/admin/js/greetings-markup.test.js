import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const markup = await readFile(join(here, "..", "index.html"), "utf8");
const source = await readFile(join(here, "greetings-catalog.js"), "utf8");
const styles = await readFile(join(here, "..", "styles", "viewers.css"), "utf8");

assert.match(markup, /id="audience-greetings-tab"/, "Audience must expose a Greetings tab");
assert.match(markup, /id="greetings-list"[^>]*role="listbox"/, "Greeting catalog must be a listbox");
assert.match(markup, /id="greetings-test"/, "Greeting catalog must provide Test");
assert.doesNotMatch(markup, /greetings-(?:create|delete)/, "Fixed greetings must not expose create/delete controls");
assert.match(source, /\["\{viewer\}", "\{streamer\}", "\{message\}"\]/, "Greeting variables must omit points");
assert.match(source, /window\.confirm\(t\("greetings\.discardConfirm"\)\)/, "Changing a dirty greeting must be protected");
assert.match(source, /let saving = false/, "Greeting catalog must track an in-flight save");
assert.match(source, /if \(saving\) return/, "Greeting rows must not switch while a save is in flight");
assert.match(source, /setAttribute\("aria-busy", saving \? "true" : "false"\)/, "Busy state must be conveyed to the list and form");
assert.match(styles, /--audience-catalog-header-height: calc\(var\(--control-min-height\) \+ 2 \* var\(--primitive-space-3\)\)/, "Catalog header height must use the control and spacing tokens");
assert.match(styles, /\.audience-catalog-list__header,[\s\S]*?min-height: var\(--audience-catalog-header-height\)/, "List and editor headers must share one minimum height");

console.log("greetings-markup OK");
