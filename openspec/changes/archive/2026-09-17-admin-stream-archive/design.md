## Context

See `proposal.md` for motivation. Session list and detail already ship:

- `GET /api/sessions?limit=20` (+ `cursor`)
- `GET /api/sessions/get?id=`

The only admin consumer is Live → Recap → History in `web/admin/js/live-recap.js`. Audience tabs today: Viewers, Journal (`history`), Progression, Commands, Greetings, Awards (`web/admin/js/audience-tabs.js`). Journal is reward history (`GET /api/reward-history`). Viewers already has a **Streams** / **Эфиры** column (`session_count`). Recap History rendering (rows, detail, totals, ranking, achievements) must not be copied into a third independent client.

## Goals / Non-Goals

**Goals:**

- First-class Audience Archive tab with the same list/detail semantics as Recap History.
- Reuse existing GET reads and recap presentation helpers.
- Keep Recap dialog History for the capture/show workflow.
- Constrained-height: pin Audience chrome, scroll the Archive body.

**Non-Goals:**

- New HTTP routes or REST `{id}` paths.
- OBS replay of historical snapshots (`POST /api/stream-recaps/show` stays current-session-only).
- Season recap (INT-032), chat archive, merging Journal with sessions.
- Removing Recap History or changing overlay `/overlay/recap`.
- PNG for sessions without a stored snapshot.

## Decisions

### 1. Audience Archive tab, not Live and not Journal

**Choice:** New Audience tab id `archive`, English **Archive**, Russian **Архив**, hash `#audience/archive`, order immediately after Viewers.

**Why:** INT-033 forbids folding this into Journal. Live is current-broadcast (messages, Recap Show). Audience already hosts look-back (Viewers, Journal). Hash pattern matches `#audience/history`.

**Alt A:** Live console tab. Rejected: mixes past-stream review with live ops; Recap button already lives there.

**Alt B:** Label the tab **Streams**. Rejected: collides with Viewers column Streams/Эфиры.

### 2. Share recap history rendering; do not fork a third client

**Choice:** Extract list-row and session-detail DOM builders (and URL helpers already in `live-recap-helpers.js`) into a module both Recap History and Archive import. Keep Recap-only chrome (Current stream, Show/Hide, all-time switch) in `live-recap.js`.

**Why:** Packet forbids a third copy of totals/ranking/achievements. One renderer keeps History and Archive aggregates identical.

**Alt:** Duplicate markup in a new `audience-archive.js`. Rejected: drift vs Recap History.

### 3. PNG only when a snapshot exists

**Choice:** Archive detail calls existing `canDownloadRecapImage` / `recap-share-image.js` with the session snapshot. No snapshot → hide Download. Never call Show/Hide from Archive.

**Why:** Package 3 PNG is session-window snapshot (or all-time, which Archive does not show). Inventing a PNG from live aggregates would not match a captured recap.

**Alt:** Always download from live `ranking` on the detail. Rejected: Recap Current already requires a snapshot for session PNG.

### 4. Deep link and lazy load

**Choice:** Parse `archive` in `AUDIENCE_TABS`. Load the first page when the tab becomes selected (including hash entry). Do not fetch sessions while the operator stays on Viewers.

**Why:** Matches Journal lazy-load; avoids extra `/api/sessions` on every Audience open.

## Risks / Trade-offs

- [Name collision] Operators confuse Archive with Journal or Viewers Streams → Mitigation: distinct label Архив; empty-state copy talks about past broadcasts, not awards.
- [Renderer drift] Incomplete extract leaves History and Archive showing different totals → Mitigation: shared module plus tests that both surfaces use the same row/detail helpers.
- [Height clip] New panel copies Recap dialog overflow bugs → Mitigation: skill `web-constrained-layout`; scroll the Archive body, not the workspace.

## Migration Plan

No SQLite or config migration. Unknown `#audience/archive` hashes already fall back to Viewers; after this change they select Archive. Rollback is revert. Recap History behavior is unchanged.

## Open Questions

None.
