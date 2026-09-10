## Why

CommRelay records successful operator awards as durable interaction events, but the operator cannot browse them. It is difficult to answer who received which award or whether repeated grants explain XP totals. Events keep only the award id, so catalog edits or deletion can obscure historical meaning.

## Users and Supported Platforms

This serves operators using the local admin in a browser or Wails WebView. History belongs to canonical viewers, so Twitch, YouTube Live, and VK Live awards remain consistent after identity merges. OBS overlays and the messages dock are unaffected.

## What Changes

- Persist the award display name as an immutable snapshot in each new award interaction event and backfill existing award events from the current catalog when possible, falling back to the stable award id.
- Make XP application and award-event persistence one successful store operation so a completed grant cannot be absent from the journal.
- Add cursor-paginated `GET /api/reward-history`, returning newest-first award entries with canonical viewer, reward id/name, points, and timestamp; optional `viewer_id` scopes one viewer.
- Add an Audience **History** tab with a global table, refresh, retry/empty states, and Load more.
- Add a paginated reward-history section to the existing wide viewer inspector and compact viewer sheet.
- Keep full chat text out of SQLite and out of history responses.

## Capabilities

### New Capabilities
- `viewer-reward-history`: Read and browse durable operator-award history globally and for one canonical viewer.

### Modified Capabilities
- `interaction-events`: Award events preserve their display meaning and may be exposed through the bounded reward-history read model.
- `admin-and-dock`: Audience gains the History tab and viewer-detail history section.
- `http-api`: The read-only reward-history route and snake_case response become public local API behavior.

## Scope / Non-Goals

No achievement rules or unlock events, donation XP, streak rewards, award editing/deletion from history, chat archive, message quote recovery, live WebSocket history feed, OBS surface, or changes to XP limits. A later achievements change may extend the same journal with another reward kind.

## Impact

Adds one SQLite migration, store/API reads, localized vanilla admin UI, and tests. Existing clients and databases remain compatible. Data stays local with no new external requests. Native OS integration and packaging are unchanged. Implementation requires an `[Unreleased]` changelog entry.
