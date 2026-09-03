## Purpose

Make reward actions, live ranking changes, and catalog selection immediately understandable to the operator without broad navigation redesign.

## ADDED Requirements

### Requirement: Active Live data follows leaderboard events

The admin SHALL apply a `leaderboard` WebSocket frame to Live Leaderboard only when its `period` matches the selected period. A hidden Live tab SHALL retain the latest matching snapshot without unnecessary rendering and SHALL render or fetch current data when opened. When Statistics is active, leaderboard changes SHALL trigger a debounced refresh no more than once per second; when hidden, Statistics SHALL refresh on its next open. The existing HTTP reads SHALL remain the initial and reconnect recovery source.

#### Scenario: Matching live period
- **WHEN** Live Leaderboard displays `session` and receives a `session` leaderboard frame
- **THEN** its rows update without the operator pressing Refresh

#### Scenario: Different period
- **WHEN** Live Leaderboard displays `day` and receives a `session` frame
- **THEN** the visible day ranking is not replaced by session rows

#### Scenario: Statistics burst
- **WHEN** Statistics is active and several leaderboard frames arrive within one second
- **THEN** the admin performs at most one debounced statistics refresh in that interval

### Requirement: Reward action reports success in context

After a successful grant, Live and dock SHALL close the picker, restore the Reward control, and announce a localized success containing the award name and positive points. Failure SHALL keep an actionable error and allow retry. The source row MUST remain available unless separately deleted.

#### Scenario: Advice granted
- **WHEN** the operator chooses Advice and the grant request succeeds
- **THEN** the row reports a localized Advice `+points` success through visible feedback and an accessible live region

#### Scenario: Grant fails
- **WHEN** the grant request fails
- **THEN** the picker or row shows an error and the operator can retry without reloading

### Requirement: Catalog selection is persistent and distinguishable

Commands and Awards lists SHALL show the currently edited item with a persistent selected state distinguishable from hover by more than color alone. The selected row SHALL use appropriate selection semantics and remain selected while its editor is open.

#### Scenario: Select an award
- **WHEN** the operator opens an award from the Audience catalog and moves the pointer away
- **THEN** that award remains visibly and semantically selected

### Requirement: New stream aligns with the Live toolbar

The existing confirmed New stream action SHALL align in the same Live toolbar row as the other hot controls at supported desktop widths without changing its confirmation or reset behavior.

#### Scenario: Live desktop toolbar
- **WHEN** the Live workspace is shown at a supported desktop width
- **THEN** New stream is vertically aligned with the other toolbar actions and remains keyboard reachable
