# QA Plan
## Platform Matrix
Linux browser automation: Chromium, Firefox and WebKit where installed. RU/EN, keyboard, compact/wide widths. Actual packaged Windows/macOS and OBS remain explicitly unverified.
## Behavior and UI Scenarios
- VIS-H01: collapse rail at 1440 then 320/375/390/520/768; label positive width, contained in button, no horizontal page overflow.
- A11Y-C01/H01/H02/H03: axe on open inspector, progression, settings, awards/greetings and Studio; verify relevant serious/critical causes are absent and contrast >=4.5.
- ERR-M01/FBK-L01: offline save keeps draft, localizes cause, retry succeeds; navigate to another section without stale feedback. Preserve HTTP validation errors.
- PERF-M01: 1000+ realistic viewers; <=50 DOM rows, global sort/search, page clamping/reset, keyboard navigation and inspector focus/dirty guard. Compare direct API timings before/after batched progression lookup; verify all-time XP threshold boundaries, quotas, empty result and missing-level errors.
- COPY-M01: RU runtime/proxy/activity explanations; EN parity.
- ONB-M01: setup CTA for empty all-disabled configuration; normal waiting when a connector is enabled; loading/error must not falsely present setup.
- FORM-M01: catalog labels, exact IDs, missing ID, metric change, load failure/retry, save/reload and confirmation remain correct.
## Filesystem / IPC / Permission / Lifecycle Scenarios
N/A: unchanged. Browser resource cancellation and draft preservation remain covered.
## Persistence Migration / Corruption / Recovery
Migration 00022: populated v21 -> v22 -> v21 -> v22, lookup plan uses index, names and identities unchanged; round-trip Settings and progression persistence.
## Install / Upgrade / Downgrade / Packaged-App Smoke
Build embedded server; native packages not available in runner and not claimed.
## Automated Commands / Manual Setup / Fixtures
`npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`, `GOCACHE=/tmp/comm-relay-ux-gocache go test ./...`, `GOCACHE=/tmp/comm-relay-ux-gocache golangci-lint run ./...`.
Use isolated e2e fixture server and temporary data; no real connectors. Keep only concise QA metrics in Git, no screenshot sweep.
## Evidence and Explicit Skips
### Executed evidence (2026-10-02)
- `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`: passed. Surface runner: 39 tests; Vitest: 21 tests across 7 files.
- Seven new Playwright scenarios cover onboarding, transport retry/section feedback, collapsed Studio at five widths, semantics/keyboard, named and unavailable subjects with retry, a 1003-viewer directory, and Russian messages. Full cross-browser run completed: 98/99 passed; the remaining Firefox static-surface smoke aborted a WebSocket handshake by navigating immediately. The test now waits for the first real frame before leaving each surface; its final rerun passed 9/9 (three repetitions in each of Chromium, Firefox and WebKit). No browser-console error allowlist was broadened. All seven new scenarios passed in all three browsers.
- Existing screenshot baselines were updated (10 existing images); no new audit screenshots were committed. Reviewed compact Live, compact/desktop Audience, viewer dialog and collapsed Studio. Compact CTA text/action form one centered group.
- axe-core 4.10.3 on the final production frontend: zero Critical/Serious for Settings Platforms/Network/Data/Application/expanded Diagnostics, Progression after loading, Greetings, Archive, Studio, open desktop inspector and new award editor. Remaining Moderate findings: nested complementary landmarks in inspector/catalogs and Studio preview heading order. These are outside the original eleven findings; no WCAG conformance certificate is claimed. A premature scan during disabled progression loading was repeated after the editor became ready. Scrollable tab panels are focusable, and a new catalog draft leaves the first existing option tabbable.
- Studio collapse at 1440 followed by 320/375/390/520/768 widths: label widths 216/271/286/416/664 px, height 19.1875 px. Every label remained inside its button; document horizontal overflow was 0. The original label was 0 px wide and 287.8 px tall.
- Settings save failure uses a typed transport error; API validation remains distinct. Both RU and EN browser tests exercise draft preservation. One pre-existing resilience test had a race: disabled meant request-in-flight as well as saved; it now waits for the actual success message before reading persisted state.

### PERF-M01 measurement
Production server, same isolated audit database with 1010 viewers; query `UX Viewer` returns 999. Direct browser fetch timing begins before fetch and ends after JSON parsing; three sequential local runs, not a field percentile. Full browser tests were running concurrently, so small timing differences are noisy.

| Stage | Headers ms (three runs) | JSON complete ms (three runs) |
|---|---|---|
| Before backend optimization | 2043.9 / 2236.3 / 1853.7 | 2077.4 / 2244.6 / 1860.9 |
| Batched levels only | 1697.5 / 1894.4 / 1234.0 | 1720.3 / 1911.2 / 1244.0 |
| Batched levels + identity index | 42.3 / 71.8 / 74.4 | 59.5 / 79.3 / 85.3 |

`EXPLAIN QUERY PLAN` before migration: `SCAN vi`, `USE TEMP B-TREE FOR ORDER BY` for the per-viewer most-recent identity query. Migration regression requires `USING INDEX idx_viewer_identities_viewer_last_seen` and preserves data through up/down/up. The API uses one level-catalog read for the directory, retaining all-time XP thresholds and metadata.

Final input-to-50-visible-rows: **503 / 404 / 374 ms**, including input dispatch, the existing 250 ms debounce, API and React rendering; corresponding response observations 473 / 374 / 356 ms. No screenshot or deliberate sleep was inside the timer. The audit's earlier 999-row observations were 2349 / 2029 / 2644 ms. This is a local comparison, not a streaming-PC SLA.

### Backend and specifications
- `GOCACHE=/tmp/comm-relay-ux-gocache go test ./...`: passed after the batch/index changes. Initial sandbox attempt could not bind httptest ports or write a missing module cache; the authorized unsandboxed run completed successfully.
- `GOCACHE=/tmp/comm-relay-ux-gocache GOLANGCI_LINT_CACHE=/tmp/comm-relay-ux-lint-cache golangci-lint run ./...`: 0 issues.
- `gofmt` applied to changed Go files. Production embedded Go server built successfully and ran the same audit database through migration 00022.
- OpenSpec change strict validation passed; all 27 canonical specifications validated. Final diff review covers API shape, level selection parity, index reversibility, dirty-draft guards, subject fallback, RU/EN parity and relevant file scope.

### Explicit skips
Real packaged Wails/Windows/macOS and OBS compositor, live platform authorization and reconnect are not executed here. They are unchanged by these fixes. Browser tests exercise static overlays/dock, debug isolation, native bridge cancellation and restart; these do not replace native host smoke.
