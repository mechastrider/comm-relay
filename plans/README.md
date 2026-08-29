# Implementation Plans — admin console review fixes

Generated 2026-08-29 from Codex session `01a04db6-4310-7b01-9c39-c8f6d0bd6d77`
(functional review finished; UI audit aborted on usage limit) plus a completed
read-only verification against HEAD `3c06b5f` on
`cursor/interactive-console-redesign-90e3` (merge-base `4e186e3`).

Execute in the order below. Each executor: read the plan fully before starting,
honor STOP conditions, and update the status row when done.

Do **not** implement from this index alone — use the numbered plan files.

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 001 | Map Settings/Studio CSS to real design tokens | P1 | S | — | TODO |
| 002 | Stop platform tabs from blanking Settings → Network | P1 | S | 001 | TODO |
| 003 | Preserve Studio draft and merge hot preset id | P1 | M | — | TODO |
| 004 | Audience platforms, period unique viewers, locale discard | P2 | M | — | TODO |

Status values: TODO | IN PROGRESS | DONE | BLOCKED | REJECTED

## Dependency notes

- 001 and 002 are independent of 003/004. Prefer 001 first: it is the visual
  cause of “tabs have no styles / spacing collapsed”.
- 002 can ship in the same PR as 001.
- 003 and 004 are behavior bugs; they can be a second PR if the visual PR
  needs to land first.

## Findings considered and rejected / downgraded

- Codex claimed Publish silently undoes a hot preset activation. **Downgraded.**
  `web/admin/js/settings.js` Publish prefers server `overlay.active_preset_id`.
  The real bug is the dirty Studio draft keeping the old id (preview/edits lag).
- Platform tab labels without `data-i18n` (Twitch/YouTube/VK) — brand names;
  leave English unless product asks otherwise.
- Adding `--space-*` aliases in `tokens.css` instead of rewriting callers —
  rejected. Existing admin CSS already uses `--primitive-space-*`. Match that.

## Verification baseline (every plan)

```bash
go test ./...
golangci-lint run ./...
npm ci && npm run lint   # if any web/admin/**/*.js changed
```

Browser smoke after 001+002: `/` → Settings tabs have gap, padding, active
accent; Studio columns have gaps; Settings → Platforms then Settings → Network
shows the SOCKS form, not a blank panel.
