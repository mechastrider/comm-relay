## Why
Operators miss the order and outcome of interactions while reading busy chat. A separate Live event feed makes successful actions reviewable without adding chat noise.

## Users and Supported Platforms
Streamers using the browser admin or packaged Wails admin on existing supported platforms.

## What Changes
Add Events beside Messages, with current-session history, category filters, precise local timestamps, bounded pagination and automatic refresh that preserves reading position. Record enough social attribution and level transitions to display durable outcomes. Record switching the existing OBS dock between messages/events as a deferred backlog idea.

## Capabilities
### New Capabilities
- `live-events`: durable operator feed and bounded current-session read API.
### Modified Capabilities
- `admin-and-dock`: Live Events navigation (dock behavior unchanged).

## Scope / Non-Goals
Successful commands, awards, likes, buffs, achievements and level increases. Exclude ordinary chat, silent XP grants, rejected/cooldown commands, sounds and new docks. No chat text persistence or platform-like ingestion.

## Impact
React admin, SQLite additive migration, store event writes and GET API. Existing event/XP/alert semantics remain intact. No new permissions, packaging or external services. Task: agentmem 67b51109-392a-4329-90bf-4a1b2ac93852.
