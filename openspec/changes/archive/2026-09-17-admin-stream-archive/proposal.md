## Why

Past stream totals sit behind Live → Recap → History. Operators cannot review a previous эфир without opening the recap production dialog. INT-033 needs a first-class admin archive: a session list and a per-stream recap card, using data that already exists.

## What Changes

- Audience gains an **Archive** tab (distinct from Journal, which remains award history, and from the Viewers **Streams** column).
- The tab lists bounded newest-first sessions and opens a detail card with the same aggregates, ranking, achievements, and captured time as Recap History.
- Sessions without a recap snapshot remain openable.
- Recap dialog History stays for the capture workflow.
- When a stored snapshot exists, the archive card MAY reuse Recap’s Download image control. No on-air Show/Hide for historical sessions.
- No **BREAKING** API change: `GET /api/sessions` and `GET /api/sessions/get` stay as specified.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `admin-and-dock`: Audience tab order includes Archive; operators review session list and detail without the Recap button. Recap History and Journal keep their current roles.

## Impact

Admin HTML/JS (Audience tabs, shared recap history rendering), EN/RU copy, `[Unreleased]` changelog, INT-033 status. HTTP, SQLite, overlay `/overlay/recap`, dock, and Recap Show/Hide are unchanged. Season recap (INT-032) and OBS replay of historical snapshots stay out of scope.
