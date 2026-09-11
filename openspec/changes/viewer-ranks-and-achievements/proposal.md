## Why

CommRelay already records durable viewer activity, grants operator-defined awards with XP, and can recognize new or returning viewers. It does not turn that history into an understandable long-term progression system. Streamers need configurable recognition that rewards participation without creating a second currency, while viewers need stable titles and milestones that can appear on stream without flooding alerts.

## Users and Supported Platforms

The change serves streamers configuring progression in the local admin UI and viewers participating through Twitch, YouTube Live, or VK Live. Progression is keyed by the existing unified viewer identity and therefore remains platform-neutral. OBS operators receive optional additions to the existing leaderboard and alert Browser Sources.

## What Changes

- Add XP-derived viewer levels (shown as titles) and configurable achievement definitions.
- Evaluate one-time and repeatable achievements from durable message, XP, award, command, session, and contract-win facts.
- Seed an editable starter catalog on fresh and upgraded installations.
- Add an Audience > Progression workspace, viewer progression summaries, and optional leaderboard titles.
- Deliver aggregated achievement and level-up notifications through the existing alert overlay; backfill and administrative reconciliation remain silent.
- Preserve unlock history when rules change by versioning achievement conditions.
- Repair viewer merge semantics so historical session facts and progression history are consolidated safely.

## Capabilities

### New Capabilities
- `viewer-progression`: Level derivation, achievement rules, progress, unlock history, backfill, and merge behavior.

### Modified Capabilities
- `admin-and-dock`: Progression administration and viewer detail presentation.
- `http-api`: Progression catalog, settings, viewer detail, and isolated preview endpoints.
- `websocket-feed`: Live progression refresh and aggregated unlock events.
- `overlay-alerts`: Achievement and level-up alert cards.
- `obs-leaderboard`: Optional viewer titles in leaderboard rows and preview.
- `viewer-stats`: Complete historical viewer merges for progression inputs.
- `config-store`: Backward-compatible leaderboard presentation setting.

## Scope / Non-Goals

Achievements do not grant XP, currency, redeemable rewards, or chat badges. Existing award repetition remains unchanged. End-of-stream MVP awards, per-achievement media, new OBS sources, and permanent Live/dock progression panels are deferred.

## Impact

The Go store, API, bus, WebSocket feed, admin UI, leaderboard, alert overlay, SQLite schema, config defaults, localization, diagnostics, and tests change. Data stays local; no connector permissions, cloud services, OS integration, installer flow, or network exposure changes. Additive SQLite migrations and optional config fields preserve upgrades and downgrade tolerance.
