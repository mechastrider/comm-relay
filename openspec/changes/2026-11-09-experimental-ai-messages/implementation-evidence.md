# Implementation evidence — 2026-11-09

Environment: Ubuntu 22.04.5 LTS, Go 1.27.1, Node 24.22.2. The implementation remains default-off and the change remains open for external-provider/native-host verification.

## Implemented

- Exact `!m` admission ahead of ordinary activity, stable identity/dedupe, independent statuses, conflict validation and immutable config revisions.
- Replaceable language-model/speech interfaces; shared Chat Completions adapter and separate ElevenLabs transport, strict schema/JSON-object validation, separate preparation and final verdict, reject/review precedence, local input/output denylist.
- Bounded worker/review queues, Unicode limits, cooldowns, provider timeouts, safe quota/auth pause and rate-limit backoff, no automatic paid retries.
- Revision-checked review actions and persistent audit/tombstones, startup cancellation, generated media cleanup and playback grace, storage failures isolated from ordinary chat.
- Settings/catalog/limit forms, accessible field help, review details with recoverable conflicts and reachable actions, recent history pagination, operator row statuses.
- Expiring/deduplicated AI alert playback, selective cancellation, independent OBS/app audio, approved-only OBS chat text with existing command visibility rules.

## Automated verification

- `npm ci`: completed; no dependency manifest/lock changes.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`: passed. Static surface tests and 38 React unit tests passed.
- `go test ./...`: passed. Final targeted `aimessage`, `api`, `config` checks passed after subsequent fixes, including the direct ingest/no-ordinary-viewer-effects scenario.
- `golangci-lint run ./...`: passed, zero issues.
- `go build -o /tmp/comm-relay-ai-server ./cmd/comm-relay-server`: passed; embedded admin built first.
- `openspec validate --specs`: 30 specifications passed. Change strict validation passed.
- Browser regression: initial full matrix ran 141 scenarios. Chromium's existing greeting focus scenario passed on retry. New settings test was corrected to use unambiguous status locators and real tab navigation; its initial run also found and fixed an implicit textarea-label association issue.
- All 83 original Chromium scenarios passed across the full run and targeted reruns. The added review scenario also passed, including stale approval/retry, a long reason and actions at 390px. All 29 Firefox scenarios passed after installing the missing browser.
- All 29 WebKit scenarios passed after environment repair. Initial launches lacked GTK/GStreamer/AVIF libraries and sudo was unavailable. Ubuntu dependency packages (including transitive gav1/yuv/absl libraries) were downloaded and unpacked under `/tmp`, then copied without overwriting files into the isolated Playwright browser cache because its launcher overrides `LD_LIBRARY_PATH`. No project dependencies or system packages were changed. The final WebKit run completed in 2.2 minutes. Across documented reruns, 84 Chromium, 29 Firefox and 29 WebKit scenarios passed.

Race detector: `aimessage`, `command` and `api` passed, including final AI/startup/ingest, history-clear playback-grace and explicit-test quota-pause checks. The combined run reached the default 10-minute timeout in `store`, with no reported data race; the isolated store suite passed in 625.902 seconds with `-timeout 25m -parallel 4`.

## Moderation evaluation and provider coverage

`internal/aimessage/testdata/moderation.json` contains 40 synthetic Russian/mixed-language cases: allowed fictional banter, explicit and masked profanity, real-person insults, ambiguous targets, meaning changes and injection attempts. Deterministic tests check orchestration with fixed provider verdicts, including local rejection of invisible control characters. They do **not** measure real-model false allows/rejects or prove meaning preservation.

No paid provider calls were made. OpenAI/OpenRouter/RouterAI/Polza model/output-mode combinations and ElevenLabs voice/tag behavior require operator-authorized live evaluation before enabling on stream. Model IDs, voice IDs, live latency and actual cost coverage: **none**. Unknown cost remains unknown.

## Distribution and remaining gates

Legacy-config default-off/save/reload and additive DB migration/restart are exercised automatically. Existing package workflows, release matrix and dependencies are unchanged. Backup/downgrade instructions are documented; an actual installed-version downgrade was not executed. Windows packaged environment inheritance, macOS Intel/ARM, Linux Wails and real OBS audible playback/cancellation have not been exercised in this headless environment. Those checks and live-provider evaluation remain open in tasks.md; no archive, release or rollout is claimed.

Review used the final diff and current contracts. Tests specifically cover concurrent approvals, rejection dominance, immutable approval, late TTS after disable, overlength audio, unknown IDs/audio-tag injection, required JSON fields/nulls, sanitized usage/error bodies, cooldowns, queue-full review recovery, retained dedupe, imported-media preservation, restart cancellation and corrupt audit isolation. No provider credentials or private command-pack contents were added to the repository.
