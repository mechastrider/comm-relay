## Context

See `proposal.md`. Audience rows currently render only a name and platform icons. `GET /api/viewers` already returns `last_seen.avatar_url`, but Twitch IRC never supplies a photo, YouTube API mapping leaves `ProfileImageUrl` unused, and OBS CEF often fails remote CDNs. Leaderboard store/API hard-code a 20-row cap, overlay HTML has no heading, and `viewers.hidden` means merge-source only.

Operator decision for this change: custom portraits are uploaded on the viewer card; a global flag disables *showing* them. Resolved portraits apply on every chat surface, including overlay and Live, when the message itself has no URL.

## Goals / Non-Goals

**Goals:**
- Persist connector avatar bytes next to overlay assets and serve them locally.
- Let the operator upload a custom portrait that overrides the cache, with a kill switch.
- Show portraits in Audience with a fallback.
- Fill empty chat/alert/leaderboard `avatar_url` from the canonical viewer.
- Map YouTube API author photos.
- Leaderboard title, max entries (default 5), and per-viewer ranking hide.

**Non-Goals:**
- Viewer `!avatar` commands or URL self-service.
- Twitch Helix profile fetch (no Client-ID/OAuth on anonymous IRC).
- Leaderboard visibility modes (always / command / interval / dock panel).
- Reusing merge `hidden` for ranking hide.
- Public HTTP bind or native file dialogs (HTML file input is enough).

## Component / Process / IPC Boundaries

```text
connector avatar_url ──► viewer ingest (SQLite identity)
                         │
                         ├─ enqueue HTTPS fetch (SSRF-safe)
                         │         ▼
                         │   overlay-assets/ + identity.avatar_cache
                         │
                         └─ resolve: custom? → cache file → remote URL
                                    │
                    /ws message + GET viewers + GET leaderboard + alerts
```

No new native IPC. Wails and browser share localhost HTTP. Cache worker is an in-process runnable. Custom uploads reuse `internal/overlayassets` with `kind` `viewer_avatar`.

## State and Event Flow

1. Ingest upserts identity `avatar_url`. If remote and not yet cached (or URL changed), enqueue a fetch.
2. Before `/ws` broadcast, empty message `avatar_url` is filled from resolve(custom, cache, remote).
3. Operator upload writes a new asset, stores `viewers.custom_avatar`, schedules leaderboard flush, refreshes the card/table.
4. Hide toggle updates `viewers.leaderboard_hidden` and flushes leaderboard snapshots.
5. Preset title / `max_entries` ride existing overlay config + `overlay_settings` / leaderboard republish.

## Threading / Async / Cancellation

Avatar fetch runs on a bounded worker (single-flight per identity, queue drop on overflow). Chat ingest MUST NOT wait on HTTP. Context cancel on shutdown drains or abandons in-flight fetches. Do not add a fetch per chat line when the URL is unchanged.

## Security and Trust Boundaries

Fetch only connector-provided avatar URLs, never chat text. HTTPS, no credentials in URL, reject loopback/private/link-local (including after redirect), size cap, sniff PNG/JPEG/WebP, no SVG/GIF. Localhost remains unauthenticated. Custom files use generated `asset_<hex>.<ext>` names. Do not log full remote URLs if they contain query tokens; log host + identity id.

## Decisions and Alternatives

1. **Files in `overlay-assets/`, not SQLite blobs.** Backups already copy that folder; `/overlay/assets/{filename}` already exists. Alternative: separate `avatars/` directory — rejected to avoid a second backup root.

2. **`kind` `viewer_avatar` at 512 KiB / 1024 px, no SVG.** Faces are small; SVG is an XSS risk in OBS. Alert images stay 4 MiB.

3. **New column `leaderboard_hidden`, do not reuse `hidden`.** `hidden` is merge-source exclusion from Audience. Ranking hide must keep the person in the directory.

4. **Title and `max_entries` on the preset leaderboard surface, not global config.** Different OBS scenes can show “Топ эфира” vs a nameless chip list. Hide flags stay per viewer.

5. **Default `max_entries` 5 (was 20).** Requested default; omitted field on old presets becomes 5. Operators who want more set it in Studio. Alternative: keep 20 for legacy — rejected because the overlay currently looks like an unbounded list.

6. **Fill empty chat avatars on the hub, not in each overlay client.** One resolution path; dock, Live, overlay, and history stay consistent. Clients do not look up viewers.

7. **No Helix in this change.** Twitch-only faces appear after a custom upload or a merged YouTube/VK identity. Document as a known limitation.

8. **`custom_avatars_enabled` default true.** Kill switch for operators who do not want overrides, without deleting stored files.

## Risks / Trade-offs

- **[Risk]** Server-side image fetch is SSRF-adjacent → Mitigate with the imagelink public-host checks plus content sniff; never fetch operator-typed URLs.
- **[Risk]** Disk growth from unique CDN URLs → Key cache by identity; replace file when URL changes; skip download when URL and file already match.
- **[Risk]** Default rank cap 5 surprises operators who liked 20 → Changelog + Studio field.
- **[Trade-off]** Twitch-only streams still have empty faces until custom upload.
- **[Trade-off]** Overlay chat that already had a remote URL is not rewritten until ingest sees a cache (first cached line onward).

## Migration / Rollout / Rollback

Goose adds `viewers.custom_avatar`, `viewers.leaderboard_hidden`, `viewer_identities.avatar_cache`. Config additive defaults. Old binaries ignore new columns/files. New binary against old DB migrates on start. Rollback: previous binary ignores extra columns; leftover files are inert. Backup = config dir including `overlay-assets`.

## Open Questions

None. Display-mode leaderboard automation stays in `var/relay_todos.md` / open questions and is out of this change.
