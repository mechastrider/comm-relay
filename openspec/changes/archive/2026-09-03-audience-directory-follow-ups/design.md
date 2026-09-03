## Context

See `proposal.md` for motivation. `GET /api/viewers` already returns canonical summaries with `last_seen` and period counters, but `handleList` passes `includeIdentities=false`, so the Audience table can only show the last-seen platform. `formatViewerPlatforms` already prefers `identities` when present and falls back to `last_seen`. Rows open the card via an Actions button or double-click; Enter/Space on a focused row already works. Score and Messages are static headers. New stream exists in both Live and Audience; the Audience control sits after the filter group in the same flex row.

## Goals / Non-Goals

**Goals:**
- Add a compact, additive `platforms` field to the existing list payload without loading full identities on every row.
- Sort, activate, and render the Audience directory in the current vanilla admin modules, keeping `GET /api/viewers/get` as the card source.
- Keep last-activity as the server order of record so the client can restore it without a new query.

**Non-Goals:**
- Server-side sort or pagination.
- Putting `identities` on the list, caching avatars, or restyling Settings/Studio tabs.
- Live-updating the full directory from `leaderboard` WebSocket frames.
- Changing merge, score, sessions, overlay, dock, native shell, or installers.

## Component / Process / IPC Boundaries

The headless server remains the source of viewer list JSON. The admin page in the browser or Wails WebView renders and sorts that payload locally. `GET /api/viewers/get` stays the only identity detail fetch. There is no new native IPC, file dialog, or overlay WebSocket consumer.

```text
SQLite identities  →  Store.List + platform collapse  →  GET /api/viewers
                                                         (platforms[])
                                                              │
                     localStorage sort preference  →  Audience table
                                                              │
                                              GET /api/viewers/get  →  card
```

## State and Event Flow

1. Audience fetch keeps current HTTP list + search debounce.
2. Client maps each row's `platforms`, or `[last_seen.platform]` when the field is missing.
3. Stored sort `{ column, direction }` is applied to the fetched array; `null` column means server last-activity order.
4. Pointer or keyboard activation on a row calls the existing `openViewerDetail`.
5. Period or search changes refetch or remetric, then reapply the same sort.

## Threading / Async / Cancellation

No new goroutines. List platform collapse runs inside the existing store lock after the list query. Admin sort is synchronous on the already-fetched array. Existing list/detail in-flight guards stay; do not add a second overlapping list request for sort.

## Security and Trust Boundaries

`platforms` are stored connector ids (`twitch`, `youtube`, `vk`), not display names or message text. The list still omits logins. Sort preference is non-secret UI state in WebView storage. No new network bind, secret, or overlay HTML injection.

## Decisions and Alternatives

1. **Collapse platforms in the store after the list query, not via `GROUP_CONCAT`.** After `List` returns viewer ids, load `(viewer_id, platform, last_seen_at)` for those ids in one query and unique-sort in Go (last-seen platform first, then remaining by `last_seen_at` desc, first occurrence wins). Alternative: SQL `GROUP_CONCAT` — rejected because unique ordered ids are awkward in SQLite and harder to test. Alternative: send full `identities` — rejected by the list/card split.

2. **Always serialize `platforms` as a JSON array.** Empty slice encodes as `[]`, never omitted. Older binaries omit the field; the admin treats a missing field as `[last_seen.platform]` when that id is non-empty, otherwise `[]`.

3. **Sort only the already-fetched result set in the client.** Server `ORDER BY last_seen_at DESC` remains the activity order. Persist `{ column: "score"|"messages"|null, direction: "asc"|"desc" }` under `commRelay.audienceSort`, matching the `commRelay.sidebarState` pattern. Invalid JSON falls back to activity order.

4. **Name is a `<button>` inside the row; the row is not a second button.** Pointer activation on the row and Enter/Space on the focused row both call `openViewerDetail`. The chevron is `aria-hidden`. Keep the existing roving `tabindex`. Alternative: keep Actions — rejected.

5. **Platform icons live in a shared admin-safe helper, not by importing overlay.js.** Reuse the existing Twitch/YouTube/VK path vocabulary. Unknown ids use the generic glyph with the raw id as name. Tooltips use `has-tooltip` / `ui-tooltip`.

6. **Audience New stream stays a sibling of the toolbar, not a filter child.** CSS grouping is enough; do not remove the Live copy or change confirmation.

## Risks / Trade-offs

- **[Risk]** Click-to-open on a compact layout always raises the sheet → Accept; that is the existing card surface.
- **[Risk]** Client sort of a large directory is only as fresh as the last HTTP list → Same as today; Refresh and search still refetch.
- **[Risk]** New admin against an old server has no `platforms` → Client fallback to `last_seen.platform`.
- **[Trade-off]** Unique platform ids hide multiple logins on one platform in the table → Card remains the place for logins.

## Migration / Rollout / Rollback

No schema or `config.json` migration. Additive JSON only. Rollback is the previous binary: it ignores `platforms`. New admin against an old server uses the last-seen fallback. No eager rewrite of stored UI preferences. Packaged artifact names are unchanged.

## Open Questions

None. Header contrast should be checked in light/dark admin themes during verification; if a token is insufficient, adjust the table header surface without changing the sort contract.
