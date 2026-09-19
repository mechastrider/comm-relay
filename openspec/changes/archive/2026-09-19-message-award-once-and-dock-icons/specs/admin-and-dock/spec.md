## MODIFIED Requirements

### Requirement: Admin and dock show accepted versus frozen command lines
Live Messages and `/dock/messages` SHALL mark a matched command line as accepted when its outcome is `fired`, including `show_leaderboard` with no splash, and as frozen when `command_outcome` is `rejected` or `cooldown`. Accepted rows SHALL show a checkmark status control that is not a button, with a localized accessible name equivalent to command accepted, and MUST NOT show the previous text chip “Command accepted” / “Команда принята”. Frozen cooldown and rejected rows SHALL show a snowflake status control that is not a button, plus the existing compact live countdown or localized reject reason beside the snowflake. Frozen cooldown rows SHALL show a live countdown of remaining cooldown time. Rejected rows SHALL show the localized reason label and MUST NOT show a cooldown countdown unless status is `cooldown`. Accepted rows MUST NOT show a countdown. Overlay chat MUST NOT use this countdown. After a page reload, while the same process is still running, admin and dock SHALL restore those statuses from recent messages plus the process-local outcome map, including rejected outcomes restored the same way as cooldown. A process restart SHALL clear restored outcomes, matching in-memory cooldown.

#### Scenario: Accepted leaderboard command
- **WHEN** `!leaderboard` fires
- **THEN** admin and dock mark that line accepted with a checkmark and without a countdown or text chip

#### Scenario: Frozen countdown
- **WHEN** the same viewer sends `!gg` during cooldown
- **THEN** admin and dock mark the second line frozen with a snowflake and tick remaining seconds beside it

#### Scenario: Ambiguous like in the dock
- **WHEN** a dock client receives `rejected` / `ambiguous` for `!like alicx`
- **THEN** that line shows a snowflake, frozen chrome, and the clarify label

#### Scenario: Reload while process lives
- **WHEN** the operator reloads admin or dock before cooldown expires
- **THEN** the frozen line still shows remaining time from the in-memory map

### Requirement: Messages offer Reward next to delete
Live Messages and `/dock/messages` SHALL show a Reward control on rows that have a stable `user_id`, in addition to delete when a source `id` exists. Reward SHALL open a picker of award types other than `like`, not a stack of per-type buttons on the row. When award id `like` exists, those same rows SHALL also show a Streamer Like control as an icon button with a visible accessible name, placed with Reward and Delete, that grants `like` without opening the picker. On `/dock/messages` only, Reward SHALL be an icon-only medal button and Delete SHALL be an icon-only trash button, each with a localized accessible name and hover/focus tooltip matching Streamer Like. Live Messages SHALL keep visible text labels on Reward and Delete. The picker MUST be usable in a height-capped dock: header stays put, the list scrolls, and the menu MUST stay fully inside the dock viewport even when Reward is a 28px icon on the right edge (it MAY grow left from that control). Action controls on a row MUST remain on one unwrapped cluster; grant feedback and command-status controls MUST NOT wrap Reward, Streamer Like, or Delete onto a new line. Command-status checkmark or snowflake SHALL sit immediately left of that action cluster and MUST NOT use action-button chrome.

#### Scenario: Reward then delete still available
- **WHEN** a message has both source `id` and `user_id`
- **THEN** both Delete and Reward are available

#### Scenario: Dock icons
- **WHEN** a dock row has identity and a source id
- **THEN** Streamer Like, Reward, and Delete are icon buttons with accessible names
- **AND** Reward and Delete have no visible text label

#### Scenario: Dock picker stays in viewport
- **WHEN** the operator opens Reward from the medal icon at the right edge of a ~400px dock
- **THEN** the picker stays fully inside the dock viewport
- **AND** award names are not clipped by the panel edge

#### Scenario: Live keeps labels
- **WHEN** the same row is shown in Live Messages
- **THEN** Reward and Delete keep their text labels
- **AND** Streamer Like remains an icon

#### Scenario: Streamer Like beside Reward
- **WHEN** a dock or Live row has a stable `user_id` and award `like` exists
- **THEN** Streamer Like, Reward, and Delete (when the source id exists) are all available
- **AND** activating Streamer Like posts `POST /api/awards/grant` with `award_id` `like`

#### Scenario: Like missing
- **WHEN** award `like` is absent
- **THEN** Streamer Like is not shown and Reward still opens the remaining-type picker

### Requirement: Reward action reports success in context
After a successful grant, Live and dock SHALL close the picker if it was open, announce a localized success containing the award name and positive points, and keep the source row available unless separately deleted. Streamer Like SHALL become unavailable for another grant on that row when `like` is in `granted_award_ids` or the grant that just succeeded was `like`. Reward SHALL remain available so other types can still be granted. The picker SHALL mark already-granted types as not choosable and MUST still list them. That announcement MUST NOT change the wrapping of the row's action buttons: Reward, Streamer Like, and Delete SHALL stay in the same positions relative to the username line as before the grant. HTTP 409 SHALL be treated as already granted: disable or dim that award's control, announce that it was already granted, and MUST NOT look like a retryable transport error. Other failures SHALL keep an actionable error and allow retry.

#### Scenario: Advice granted
- **WHEN** the operator chooses Advice and the grant request succeeds
- **THEN** the row reports a localized Advice `+points` success through visible feedback and an accessible live region
- **AND** Reward and Delete do not move to a new line
- **AND** Advice is not choosable again in that row's picker

#### Scenario: Streamer Like granted
- **WHEN** the operator activates Streamer Like and the grant succeeds
- **THEN** the row reports a localized Streamer Like `+points` success
- **AND** Streamer Like is no longer activatable on that row
- **AND** Reward remains available for other types

#### Scenario: Duplicate like
- **WHEN** Streamer Like is activated and the server returns HTTP 409
- **THEN** Streamer Like becomes inactive on that row
- **AND** the row does not present the ordinary grant-failed retry copy as the only explanation

#### Scenario: Grant fails
- **WHEN** the grant request fails with a non-conflict error
- **THEN** the picker or row shows an error and the operator can retry without reloading

#### Scenario: Reload restores granted like
- **WHEN** recent messages include `granted_award_ids` `["like"]`
- **THEN** Streamer Like on that row is not activatable after load
