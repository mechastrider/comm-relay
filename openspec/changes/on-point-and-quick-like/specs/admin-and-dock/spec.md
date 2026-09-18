## MODIFIED Requirements

### Requirement: Messages offer Reward next to delete
Live Messages and `/dock/messages` SHALL show a Reward control on rows that have a stable `user_id`, in addition to delete when a source `id` exists. Reward SHALL open a picker of award types other than `like`, not a stack of per-type buttons on the row. When award id `like` exists, those rows SHALL also show a Streamer Like control as an icon button with a visible accessible name, placed with Reward and Delete, that grants `like` without opening the picker. The picker MUST be usable in a height-capped dock: header stays put, the list scrolls. Action controls on a row MUST remain on one unwrapped cluster; grant feedback MUST NOT wrap Reward, Streamer Like, or Delete onto a new line.

#### Scenario: Reward then delete still available
- **WHEN** a message has both source `id` and `user_id`
- **THEN** both Delete and Reward are available

#### Scenario: Streamer Like beside Reward
- **WHEN** a dock or Live row has a stable `user_id` and award `like` exists
- **THEN** Streamer Like, Reward, and Delete (when the source id exists) are all available
- **AND** activating Streamer Like posts `POST /api/awards/grant` with `award_id` `like`

#### Scenario: Like missing
- **WHEN** award `like` is absent
- **THEN** Streamer Like is not shown and Reward still opens the remaining-type picker

### Requirement: Reward action reports success in context
After a successful grant, Live and dock SHALL close the picker if it was open, restore Reward and Streamer Like as enabled controls, and announce a localized success containing the award name and positive points. That announcement MUST NOT change the wrapping of the row's action buttons: Reward, Streamer Like, and Delete SHALL stay in the same positions relative to the username line as before the grant. Failure SHALL keep an actionable error and allow retry. The source row MUST remain available unless separately deleted.

#### Scenario: Advice granted
- **WHEN** the operator chooses Advice and the grant request succeeds
- **THEN** the row reports a localized Advice `+points` success through visible feedback and an accessible live region
- **AND** Reward and Delete do not move to a new line

#### Scenario: Streamer Like granted
- **WHEN** the operator activates Streamer Like and the grant succeeds
- **THEN** the row reports a localized Streamer Like `+points` success
- **AND** Streamer Like, Reward, and Delete remain in the same action cluster

#### Scenario: Grant fails
- **WHEN** the grant request fails
- **THEN** the picker or row shows an error and the operator can retry without reloading
