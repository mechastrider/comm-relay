# Implementation Slices

## Slice: Audience directory shows merged platforms and opens on one click

> **Outcome**: Operators can sort the Audience table, see unique platform icons for a merged viewer, and open the card with a single click or keyboard without an Actions column.
> **Acceptance**: `go test ./internal/store/... ./internal/api/...`; `npm test`; `npm run test:i18n`; Audience smoke for merge icons, sort persist, click/keyboard, and New stream confirmation.
> **Skills**: `comm-relay`, `api-conventions`, `golang-tests`, `web-static-frontend`, `web-constrained-layout`, `ux-form-practices`
> **Scope**: Viewer list store/API, Audience table JS/CSS, platform-icon helper, English/Russian copy.
> **Allowed fallout**: Shared helpers, fixtures, locale keys, changelog.
> **Blocked**: Score/XP/Credits, avatars, overlay/dock, tab-taxonomy rewrite, saved messages, signing, publishing.

### Backend and protocol

- [x] 1.1 After `Store.List`, collapse unique platform ids (last-seen first, duplicates removed) and cover merged Twitch+YouTube, same-platform duplicates, and last-seen-first order in store tests.
- [x] 1.2 Serialize `platforms` as a JSON array on `GET /api/viewers` (empty `[]`, no `identities`) and assert `GET /api/viewers/get` still returns full identities.

### Frontend and UI

- [x] 1.3 Add client helpers for period-aware sort cycling (`none` → desc → asc → none), `commRelay.audienceSort` persistence with invalid fallback, and missing-`platforms` fallback to `last_seen.platform`; register any new test file in `package.json` `test`.
- [x] 1.4 Add a shared platform-icon helper (Twitch, YouTube, VK, unknown) with accessible name and tooltip, without importing overlay.js.
- [x] 1.5 Make Score and Messages sort buttons with a distinct header surface, visible direction, and `aria-sort`; reapply stored sort after fetch, search, and period change.
- [x] 1.6 Replace Actions with a name `<button>`, decorative `aria-hidden` chevron, and single-click row activation through existing `openViewerDetail`; keep Enter/Space and row arrow roving.
- [x] 1.7 Render unique platform icons (or a localized empty state) and move Audience New stream out of the filter group without changing Live confirmation.

### Documentation

- [x] 1.8 Append concise Russian `[Unreleased]` bullets for platforms, sort, and one-click cards; skip README/FAQ unless the table cannot be used from existing Audience copy.

## Gate: qa

- [x] Q.1 Execute `qa_plan.md`; record matrix coverage, merged-viewer JSON, screenshots, and explicit skips.
- [x] Q.2 Run `npm ci`.
- [x] Q.3 Run `npm test`.
- [x] Q.4 Run `npm run test:i18n`.
- [x] Q.5 Run `npm run lint`.
- [x] Q.6 Run `go test ./...`.
- [x] Q.7 Run `golangci-lint run ./...`.
- [x] Q.8 Run `go build ./...`.
- [x] Q.9 Run `openspec validate audience-directory-follow-ups --strict`.
- [x] Q.10 Run `git diff --check`.

## Gate: review

- [x] R.1 Fresh diff review; CRITICAL=0; affected checks green.
- [x] R.2 Confirm additive `platforms` only, no identities on the list, and no SQLite/`config.json` migration.

## Gate: distribution-readiness

- [x] D.1 Confirm existing package names/contents besides embedded web/Go list JSON; do not sign, notarize, upload, or publish.
- [x] D.2 Packaged Wails Audience smoke skipped on this Cloud Agent (no packaged WebView). Headless server + Chromium `/#audience` smoke recorded in `qa_evidence.md`; overlay/OBS skipped as out of scope.
