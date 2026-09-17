## Why

Session recap already captures one immutable end-of-stream snapshot, but operators also want a **status for all time** on the same `/overlay/recap` source and a PNG they can post to social networks. Today the overlay can only show the captured session, and there is no local image export.

## Users and Supported Platforms

Streamers and OBS operators using the local admin UI, Wails desktop, or headless server with existing Twitch, YouTube Live, and VK Live connectors. PNG download uses the hosted Recap dialog in Chromium/Wails; no new OS, installer, or connector support is added.

## What Changes

- Keep session Show/Hide/capture exactly as today: one immutable snapshot per open session, no New stream side effects.
- Add an all-time **status** window on the same recap surface. Showing all-time MUST NOT insert a `stream_recaps` row. Unique viewers are canonical viewers with `message_count > 0`; totals use all-time `viewers` XP and messages; Top 5 follows `GET /api/leaderboard?period=all` eligibility and ordering, capped at five. Session achievement groups MUST NOT appear.
- While recap is visible, the operator MAY switch session ↔ all-time without New stream. Hide and New stream still hide every window. Process restart starts hidden.
- Add **Download image** in the Recap dialog: an opaque 16:9 share-card of the selected window, encoded from presentation data, not a screenshot of the transparent OBS source.

## Capabilities

### New Capabilities

- None. All-time status and share export extend existing recap capabilities.

### Modified Capabilities

- `stream-recaps`: windowed presentation; all-time is ephemeral status.
- `obs-recap`: session vs all-time composition and copy; overlay stays transparent.
- `admin-and-dock`: window switch and PNG download in the Recap dialog.
- `http-api`: current payload gains `window` and `all_time`; new `POST /api/stream-recaps/show-all`.
- `websocket-feed`: `stream_recap_state` carries `window` and optional `all_time`.

## Scope / Non-Goals

Out of scope: season/month/campaign windows (INT-032); embedding live all-time inside the stored session snapshot; html2canvas of the OBS Browser Source; on-air replay of a historical snapshot (INT-033); square export; new SQLite schema; clipboard as a required second primary action; installer/signing.

## Impact

Admin Recap dialog, `/overlay/recap` copy/layout, HTTP/WebSocket recap envelopes, localization, CHANGELOG, and tests change. No migration, config key, connector permission, or packaging layout change. Older clients ignore unknown fields; this binary ships matching overlay and admin assets together. PNG stays on the user's machine via a browser download. Localhost trust boundary is unchanged.
