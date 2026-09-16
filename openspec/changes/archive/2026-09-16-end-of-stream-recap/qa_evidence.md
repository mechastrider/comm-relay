# QA Evidence — end-of-stream-recap

Recorded in Cloud Agent (Linux amd64) on 2026-09-16. Gates **Q.1**, **Q.4**, and **D.2** from [`qa_plan.md`](qa_plan.md).

## Q.1 — P0 behavior matrix (automated + headless smoke)

### Automated gates (repository root)

| Command | Result |
|---------|--------|
| `go test $(go list ./... \| grep -v node_modules) -count=1` | passed |
| `go test -race -count=1 ./internal/store ./internal/api ./internal/bus ./internal/bootstrap` | passed (store ~275s, api ~217s) |
| `npm test` | passed, 209 tests |
| `openspec validate end-of-stream-recap --strict` | passed |

### P0 scenarios covered by focused tests (non-exhaustive mapping)

| qa_plan row | Evidence |
|-------------|----------|
| stream-recaps / first show, repeat show, stale 409 | `internal/api/stream_recaps_handler_test.go` |
| stream-recaps / concurrency | race suite + handler tests |
| HTTP API recap + sessions routes | `stream_recaps_handler_test.go`, sessions handler tests, router guard |
| WebSocket `stream_recap_state` | `TestStreamRecaps_WebSocket_WhenShowAndReconnect_ExpectVisibleState` |
| viewer stats/history pagination | `internal/store/*session*` tests |
| interaction-events session attribution | store migration `00019` + event write tests |
| viewer-progression attribution | migration + progression store tests |
| Migration Up/Down/Up, FK integrity | `internal/store/migration_00019_test.go` |
| config-store recap opacity | `internal/config` tests (task V.2 scope) |
| Live/Studio/recap frontend | `web/admin/js/live-recap*.test.js`, `web/recap/*.test.js`, npm suite |

### Headless HTTP smoke (disposable data dir)

- Built `/tmp/comm-relay` from `cmd/comm-relay-server`.
- Fresh SQLite via goose through **00019** on first start.
- `GET /health` → `{"status":"ok",...}`.
- `GET /overlay/recap` → HTTP 200.
- `GET /api/stream-recaps/current` → JSON with `session_id`, `is_current`, `has_recap`.

### Explicit P0 skips (environment)

- Windows 11 / macOS OBS CEF matrix, packaged Wails/WebView2 smoke, and multi-theme screenshot grid require release workstations; not executed in this Linux agent.
- Manual keyboard-only Live dialog at 200% zoom: covered by existing admin Node tests where noted in change tasks Q.3; not re-run as manual session here.

## Q.4 — Install / upgrade / rollback lifecycle

| Check | Result |
|-------|--------|
| Fresh DB migrates to 00019 | observed in headless smoke log (`goose: successfully migrated database to version: 19`) |
| Migration fixtures Up/Down/Up, conservative backfill, FK | `TestMigration00019_WhenSessionIntervalsVary_ExpectConservativeAttributionAndReversibleSchema` |
| Recap unique session + JSON constraints | `TestMigration00019_WhenRecapConstraintsApplied_ExpectUniqueSessionAndValidJSON` |
| Binary rollback on additive DB | **Documented skip**: prior-package rollback against post-00019 DB is release QA only; migration Down/Up validated in store tests |
| Process restart hidden visibility | handler/WS tests + design (ephemeral visibility); full restart manual on release matrix |

## D.2 — Packaged artifact smoke

| Check | Result |
|-------|--------|
| Headless server build | `go build -o /tmp/comm-relay ./cmd/comm-relay-server` — success (~35 MB) |
| Recap static route served | headless smoke above |
| Wails desktop build | `go build -tags wails ./cmd/comm-relay-desktop` — success in agent (WebView deps present) |
| Windows ZIP / macOS universal ZIP layout inspection | **Skip**: release workflow artifacts not produced in agent; distribution_plan unchanged |
| Fresh/upgrade packaged app on Windows/macOS | **Skip**: requires operator release environment |

No user `config.json` or database fixtures were bundled into test binaries.
