## Why

CommRelay can show an alert when a viewer explicitly invokes `!hi`, but it cannot welcome a viewer automatically on their first-ever ordinary message or their first ordinary message in a confirmed stream session. Stream notes show that these are distinct moments and that operators need control over their frequency and presentation so greetings do not become intrusive.

## Users and Supported Platforms

Streamers and OBS operators can configure greetings in the local admin UI. Identified viewers from Twitch, YouTube Live, and VK Live receive the same canonical-viewer behavior; messages without a stable platform user id remain ineligible.

## What Changes

- Add two independently enabled, fully editable automatic greetings: **New viewer** and **Returning viewer**.
- Give a first-ever greeting precedence when both conditions match, producing at most one automatic greeting for a message.
- Trigger greetings only from ordinary identified chat messages. Recognized command lines remain eligible for their command action but do not consume greeting eligibility.
- Persist greeting definitions and delivery markers in the local viewer SQLite database so restarts do not duplicate greetings.
- Add an Audience → Greetings catalog with the same text, image, sound, layout, volume, image sizing, and duration controls as alert commands, plus a non-delivering test preview.
- Let the operator exclude an individual canonical viewer from automatic greetings.
- Deliver greetings through the existing `/overlay/alert` surface in an expiring low-priority queue lane below awards and contracts.

## Capabilities

### New Capabilities
- `viewer-greetings`: Configure, qualify, prioritize, suppress, preview, and deliver automatic viewer greetings.

### Modified Capabilities
- `admin-and-dock`: Expose the greeting catalog and per-viewer exclusion control in Audience.
- `http-api`: Read and update greeting definitions, preview a greeting, and update viewer exclusion through POST-action APIs.
- `overlay-alerts`: Render greeting alerts and schedule them as low-priority expiring work.
- `viewer-stats`: Detect first-ever and first-in-session ordinary messages for canonical viewers without changing XP.

## Scope / Non-Goals

No greeting XP, early-viewer rewards, automatic stream-boundary detection, chat-platform replies, generalized rules engine, or new OBS source. `POST /api/sessions/start` remains the authoritative returning-viewer boundary.

## Impact

The change adds local SQLite schema, HTTP JSON fields/routes, admin UI, diagnostics, and an alert source. Both greetings default disabled for fresh and upgraded installations. No connector-specific behavior, secrets, external services, OS integration, or packaging changes are required.
