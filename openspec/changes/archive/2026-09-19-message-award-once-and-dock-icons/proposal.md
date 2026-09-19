## Why

The operator can grant the same award on the same chat line as many times as they click. That was an explicit early choice, but accidental repeats (especially one-click Streamer Like) add XP and queue extra alerts. OBS dock message actions are also mixed: Like is already an icon, while Reward, Delete, and the “Command accepted” chip look like extra buttons and crowd the username row.

## Users and Supported Platforms

Local streamers and OBS operators on current Windows desktop and headless server. Viewers stay on existing Twitch, YouTube Live, and VK Live ingest. No new OS, connector, or installer surface.

## What Changes

- `POST /api/awards/grant` MUST reject a second grant of the same `award_id` for the same source `platform` + `message_id` with HTTP 409, without XP or an alert. Different award types on that line remain allowed. Grants without a stable `message_id` stay unrestricted.
- Recent-message reads restore which award ids already landed on a line so Live and dock can disable that control after reload.
- `/dock/messages` Reward and Delete become icon-only (medal, trash) with the same tooltip/`aria-label` pattern as Streamer Like. Live keeps labeled Reward/Delete.
- Accepted command lines show a checkmark status (not a button). Frozen cooldown/rejected lines show a snowflake plus the existing compact countdown or reject reason. Sketch: [`docs/mockups/dock-message-row-icons.html`](../../../docs/mockups/dock-message-row-icons.html).

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `operator-rewards`: one grant per award type per source message; other types still allowed.
- `http-api`: grant conflict 409; recent messages expose granted award ids.
- `admin-and-dock`: dock icon actions; check/snowflake command chrome; granted-control state.

## Scope / Non-Goals

Not in scope: session/day XP caps for a viewer ([OQ-005](../../../docs/open-questions.md#oq-005)); unique-any-award-per-message; Live icon-only Reward/Delete; overlay operator buttons; new HTTP routes; unique SQLite index that would fail on historical duplicates; Credits; Community Awards.

## Impact

Grant uniqueness is enforced in the existing award transaction using `interaction_events`. Optional `granted_award_ids` on `GET /api/messages/recent`. Shared command-outcome chrome for Live and dock; icon Reward/Delete only on the dock. Streamer-visible `[Unreleased]` changelog. Localhost boundary unchanged. Older binaries ignore extra JSON fields and keep allowing duplicate grants.
