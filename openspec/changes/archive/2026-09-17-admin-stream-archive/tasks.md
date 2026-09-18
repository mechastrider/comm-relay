# Tasks

## 1. Frontend

- [x] 1.1 Extract Recap History row and session-detail DOM builders (totals, ranking, achievements, markers) from `web/admin/js/live-recap.js` into a shared module that Recap History imports. Keep Current stream, window switch, Show/Hide, and confirm flow in `live-recap.js`. Verify `node --test web/admin/js/live-recap-helpers.test.js web/admin/js/live-recap-markup.test.js` still pass and Recap History still uses the shared helpers (no duplicated ranking markup in a third file).
- [x] 1.2 Add Audience tab `archive` immediately after Viewers: button + panel in `web/admin/index.html`, `AUDIENCE_TABS` / hash `#audience/archive` in `audience-tabs.js`, DOM ids, EN `audience.tabArchive` **Archive** and RU **Архив**. Journal (`history`) stays award history. Verify new `web/admin/js/audience-tabs.test.js` (`parseAudienceHash("#audience/archive")` → `archive`; unknown hash still Viewers) and update `reward-history-markup.test.js` tab-order assertion. Register the new test in `package.json` `test`.
- [x] 1.3 Implement Archive list/detail in a new admin module: lazy-load `GET /api/sessions` on tab select, explicit next-page control, open `GET /api/sessions/get?id=`, Back to list, empty state, shared row/detail renderer. Hide Show / Show all-time / Hide. Offer Download image only when a stored snapshot exists (`canDownloadRecapImage` + `recap-share-image.js`). Wire `init` from `app.js` `onTabChange`. XSS-safe `textContent` only. Verify module tests cover empty list, captured vs uncaptured detail, and download hidden without snapshot.
- [x] 1.4 Style Archive with pinned Audience chrome and a scrollable body (`min-height: 0; overflow: auto`) per `web-constrained-layout`. Reuse recap history row/detail classes where practical. Verify a markup/CSS test asserts the panel body can scroll and tabs are not `overflow: hidden` without a scrolling descendant.

## 2. Docs

- [x] 2.1 Append a Russian `[Unreleased]` **Добавлено** bullet that a streamer would notice: Audience → Архив lists past streams and opens the same totals as Recap History without the Recap button (skill `changelog`). Do not rewrite versioned CHANGELOG sections.
- [x] 2.2 Set INT-033 to `in_progress` in `docs/interactive/backlog.md` with change `admin-stream-archive`. Do not mark `implemented` until archive.

## 3. Verification

- [x] 3.1 `gofmt` / `goimports` only if Go files were touched; otherwise skip. `go test ./internal/api -count=1` if router or handlers changed; otherwise skip Go tests.
- [x] 3.2 `npm ci && npm test && npm run test:i18n && npm run lint`
- [x] 3.3 `golangci-lint run ./...` only if Go files were touched; otherwise skip.
- [x] 3.4 `openspec validate admin-stream-archive --strict`
- [x] 3.5 Browser P0: `#audience/archive` shows session list without Recap dialog; open a session without snapshot (aggregates, no Show, no Download); open a captured session (snapshot time, Download works, overlay unchanged); Recap History still works; Journal still awards; `/overlay` stays transparent. At ~700px height, Archive body scrolls and tabs stay visible.

## Scope / Blocked

**Blocked:** new session HTTP routes, OBS historical replay, season recap, removing Recap History, merging Archive with Journal, PNG without a stored snapshot.
