import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const markup = await readFile(join(here, "..", "index.html"), "utf8");
const styles = await readFile(join(here, "..", "styles", "viewers.css"), "utf8");

assert.match(markup, /id="audience-archive-tab"[\s\S]*?data-audience-tab="archive"/);
assert.match(markup, /id="audience-archive-panel"[\s\S]*?role="tabpanel"/);
assert.match(markup, /id="audience-archive-content"/);
assert.match(
  styles,
  /\.audience-archive__content\s*\{[\s\S]*?min-height:\s*0[\s\S]*?overflow:\s*auto/
);
assert.match(styles, /\.audience-tabs\s*\{[\s\S]*?overflow-x:\s*auto/);

console.log("audience-archive markup OK");
