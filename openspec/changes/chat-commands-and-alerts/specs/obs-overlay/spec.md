## ADDED Requirements

### Requirement: Alert is an on-stream surface of the same theme
A selectable overlay theme SHALL cover chat, leaderboard, and the alert splash surface. `/overlay/alert` SHALL follow the active preset when `preset` is omitted, honor a valid `preset` pin, and accept the same `preview_background` values as chat when loaded in Studio preview.

#### Scenario: Unpinned alert follows activation
- **WHEN** `/overlay/alert` has no `preset` query and the active preset changes
- **THEN** the alert page applies the newly active theme without a URL change

#### Scenario: Studio preview of alerts
- **WHEN** Studio preview targets the alert surface with `preview=sample`
- **THEN** the iframe shows a fictitious splash and MUST NOT consume live `/ws` `alert` frames as the only preview content
