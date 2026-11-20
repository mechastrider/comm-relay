# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|---|---|---|---|
| Windows supported release baseline | amd64 | Light/dark, 100/150/200%, keyboard, packaged WebView2 + OBS | yes |
| macOS supported release baseline | Intel/Apple Silicon | Light/dark, Retina, keyboard, packaged WebKit + OBS | yes before platform support claim |
| Linux supported release baseline | amd64 | Light/dark, scaling, keyboard, packaged WebKitGTK + OBS | yes before platform support claim |
| CI headless Linux | current runner | Browser admin, Playwright, fake HTTP providers | yes |

Record exact tested OS versions rather than treating runner names as supported versions.

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|---|---|---|---|
| config-store / gate | Load legacy config, enable invalid config, disable during TTS | Default off, safe error, late result discarded | P0 |
| chat-commands / trigger | Exact !m, empty, !mm, m alias conflict, off-state baseline | No fuzzy match; collision rejected; existing commands unchanged | P0 |
| ai-messages / preservation | RU typos, abbreviations, numbers, C-Bills, mixed language | Meaning preserved, readable banner, expanded speech | P0 |
| ai-messages / moderation | Profanity, obfuscation, real-person insult, fictional banter, ambiguous nickname | Reject/allow/review corpus expectations; input and output checked | P0 |
| ai-messages / injection | Viewer asks to ignore rules, inject voice ID/URL/tags or call tools | No tool execution, only approved IDs, forbidden text not spoken | P0 |
| ai-messages / review | Two admin clients approve, expire, change config, queue full | One immutable approval, conflicts safe, no duplicate paid calls | P0 |
| ai-messages / bounds | Unicode boundaries, 300/301 input, 600/601 speech, 30/31-second audio | Accurate limits, no truncation or overspend before admission | P0 |
| ai-messages / providers | Mock compatible responses, refusal, invalid JSON, unsupported schema, oversized audio | Explicit errors, no silent downgrade/retry | P0 |
| ai-messages / budgets | Auth error, exhausted quota, transient 429, missing Retry-After, timeout | Pause/backoff distinction, no paid fallback or replay | P0 |
| overlay-alerts / queue | Protected lane saturation, ordinary command expiry, AI deadline | Existing priority intact; stale AI silent | P0 |
| overlay-alerts / playback | Duplicate ID, cancel current, reconnect, zero volume, app preference | No duplicate/replay; matching AI only canceled; independent OBS audio | P0 |
| UI / accessibility | Keyboard review, long reason, narrow view, 200% zoom, RU/EN | Actions reachable; no clipped body; correct focus/status | P1 |
| UI / privacy | Inspect GET config, WS, exports and logs | No keys; moderation reasons absent from OBS frames | P0 |
| observability | Inject each skip/failure and inspect diagnostics | Bounded counters, correlation IDs, unknown cost not zero | P1 |

Russian moderation corpus must include at least 40 curated synthetic cases across allowed game banter, explicit profanity, masked/Unicode profanity, insults of real people, ambiguity, injection and meaning changes. Mock tests assert orchestration deterministically. Live model evaluation reports false allows/rejects/review rate and examples; do not claim tests prove perfect moderation. Explicit forbidden fixtures reaching allow block rollout; iterate policy/model before enabling live use.

## Filesystem / IPC / Permission / Lifecycle Scenarios

Deny app-data writes, fail atomic rename, disconnect TLS/DNS, sleep past deadlines, shutdown during each stage, cancel during provider response, change stream while review waits. Ordinary chat must remain responsive. Test environment keys inherited by actual packaged desktop launch, not only development shell. No child processes, microphone permissions or new native IPC to test.

## Persistence Migration / Corruption / Recovery

Upgrade seeded existing DB, repeat startup, concurrent action revision checks, failed audit commit, malformed prepared JSON, missing media, startup temp cleanup, seven-day/1,000-row retention and dedupe tombstones. Confirm cleanup never removes imported assets and protects playback grace period. Disable audit writes: AI pauses, ordinary commands still operate.

## Install / Upgrade / Downgrade / Packaged-App Smoke

Build embedded frontend first. Fresh package defaults off; upgrade preserves commands/settings; missing credential message explains setup. Enable with synthetic test content and verified voices; show/hear one alert in OBS; disable while playing. Verify downgrade after backup/disable without destructive migration. Signing/publication is outside QA authority.

## Automated Commands / Manual Setup / Fixtures

Implementation commands from repo root:

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
go test ./...
go test -race ./internal/aimessage/... ./internal/command/... ./internal/api/... ./internal/store/...
golangci-lint run ./...
npm run test:e2e
go build ./cmd/comm-relay-server
openspec validate 2026-11-09-experimental-ai-messages --strict
```

Use httptest fake providers, injected clocks, local generated test audio with known duration and disposable app-data directories. Never call paid services in automated suites. Live smoke uses operator-authorized test credentials and a small explicit request allowance, recording provider/model/output-mode/voice and latency. Exercise all four LLM presets before claiming each tested; otherwise label documentation-compatible but unverified. Test ElevenLabs tag rendering with actual selected voice/model; no automatic alternative paid requests on failure.

## Evidence and Explicit Skips

This design PR runs OpenSpec validation and diff/link review only; runtime tests are intentionally not run because no executable code changes. Implementation must record command outputs, package commit/version, screenshots/traces for UI and sanitized live-provider results. Missing platform/provider access is an explicit coverage gap, not a pass. Native installer/signing checks are skipped because those surfaces are unchanged and publication is not authorized.
