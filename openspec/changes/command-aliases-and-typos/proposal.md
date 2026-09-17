## Why

Viewers often miss a chat command because of a typo (`!heate` instead of `!heat`) or a second name the operator already uses. Today `Lookup` matches only the exact canonical trigger, so those lines stay ordinary chat: no alert, no `is_command`, no `command_outcome`. Packet 1 already tells clients whether a matched command fired or is on cooldown; this change makes the intended command match in the first place.

Operator intent (INT-016 + INT-037): explicit aliases plus a narrow unique-winner typo match. Not “did you mean”, not fuzzy phrases.

## Users and Supported Platforms

Operators edit the Audience command catalog. Viewers send whole-line bang commands from Twitch, YouTube Live, and VK Live. Admin, dock, overlay, and `command_outcome` keep using the canonical command id/trigger. Headless server and Wails desktop share the same SQLite catalog and matcher. No OS-specific UI.

## What Changes

- Each command may store additional trigger slugs (aliases) with uniqueness across every catalog trigger and alias.
- Audience command editor can add, save, and show alias conflicts.
- Matcher: exact canonical or alias match first; otherwise Damerau-Levenshtein distance ≤ 1 against enabled commands whose canonical trigger is at least 4 characters, only when exactly one command wins.
- Cooldown, interaction events, alerts, and `command_outcome.trigger` stay on the canonical command. Chat text on the line stays as typed.
- Pack YAML may list `aliases`. Goose migration adds `command_aliases`.

## Capabilities

### New Capabilities

- None. Aliases and typo matching extend the existing command catalog.

### Modified Capabilities

- `chat-commands`: alias catalog, uniqueness, exact-then-fuzzy match, canonical cooldown/outcome
- `http-api`: `aliases` on command list/create/update
- `admin-and-dock`: command editor aliases and conflict errors
- `websocket-feed`: `is_command` and `command_outcome.trigger` after alias/typo match (canonical trigger)

## Scope / Non-Goals

In scope: catalog aliases, uniqueness UX, unique Damerau ≤ 1 on whole bang lines without spaces, pack YAML aliases, streamer-visible changelog.

Out of scope: “did you mean” without firing; fuzzy `!heat please`; translit, phonetics, adjacent-key maps; parameterized commands; SQLite cooldown persistence; platform chat replies; overlay countdown.

## Impact

UI: Audience command editor only. Overlay/dock show the typed line; outcomes already use canonical trigger.

OS: none. Local data: new `command_aliases` table; empty after upgrade until the operator saves aliases. Downgrade: older binaries ignore the table and match exact triggers only.

Security/privacy: same localhost catalog; no new identity fields. Packaging: ordinary binary/static assets; no installer change.
