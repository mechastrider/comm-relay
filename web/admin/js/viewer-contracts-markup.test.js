import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const markup = await readFile(join(here, "..", "index.html"), "utf8");
const module = await readFile(join(here, "viewer-contracts.js"), "utf8");
const tabs = await readFile(join(here, "live-tabs.js"), "utf8");
const styles = await readFile(join(here, "..", "styles", "contracts.css"), "utf8");
const dock = await readFile(join(here, "..", "..", "dock", "messages.js"), "utf8");

assert.match(markup, /id="live-contracts-tab"[^>]*role="tab"[^>]*aria-controls="live-contracts-panel"/);
assert.match(markup, /id="live-contracts-panel"[^>]*role="tabpanel"/);
assert.match(markup, /for="live-contract-title"/);
assert.match(markup, /for="live-contract-objective"/);
assert.match(markup, /for="live-contract-reward"/);
assert.match(markup, /id="live-contract-winner-dialog"[^>]*aria-labelledby/);
assert.match(markup, /id="live-contract-award-dialog"[^>]*aria-labelledby/);
assert.match(markup, /id="live-contract-close-dialog"[^>]*aria-labelledby/);
assert.match(module, /new AbortController\(\)/);
assert.match(module, /if \(controller !== currentController\) return/);
assert.match(module, /let viewerController = null/);
assert.match(module, /if \(viewerController !== currentViewerController\) return/);
assert.match(module, /\[el\.winnerDialog, el\.awardDialog, el\.closeDialog\]\.forEach\(closeDialog\)/);
assert.match(tabs, /"contracts"/);
assert.match(tabs, /next === "contracts" && previous !== "contracts"[\s\S]*loadTabData\("contracts"\)/);
assert.match(styles, /max-height: min\(42rem, calc\(100dvh - 2rem\)\)/);
assert.match(styles, /\.viewer-contract-dialog:not\(\[open\]\) \{ display: none; \}/);
assert.match(styles, /viewer-contract-dialog__body[^}]*overflow: auto/s);
assert.match(styles, /viewer-contract-dialog__footer \{ flex: 0 0 auto/);
assert.doesNotMatch(dock, /wire && wire\.type === "alert"/);

console.log("viewer-contracts-markup OK");
