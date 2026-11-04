# Proposal

## Why

Operators need a distinct way to recognize viewers who explain the story, world, and lore of a game or community. A starter Lore Expert award makes that contribution discoverable and rewards it with the agreed 50 XP.

## What Changes

- Add editable, deletable `lore_expert` with 50 XP, Russian/English copy, chime sound, and a five-second alert.
- Initialize it once on fresh and existing installations, preserving existing rows and subsequent deletion or edits.
- Render a text-free open-book emblem in the existing admin and OBS alert presentation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `operator-rewards`: locale-aware one-time Lore Expert award initialization and semantic emblem.

## Impact

Store catalog bootstrap, shared alert emblem, regression tests, and Russian changelog. Existing grant, XP, history, and alert delivery paths remain applicable; no new achievement, API, or database schema is needed.
