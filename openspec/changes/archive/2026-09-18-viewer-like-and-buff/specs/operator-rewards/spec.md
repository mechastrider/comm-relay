## ADDED Requirements

### Requirement: Locale-aware viewer-like starter award
On first social-catalog initialization of a database that does not already contain award id `viewer_like`, the system SHALL insert a deletable starter award `viewer_like` with 5 points, the `soft` sound, and 5000 millisecond duration. Display names and splash templates SHALL match the initialization locale: `Лайк зрителя` / `Лайк зрителя для {viewer}! +{points}` for `ru-RU` and `Viewer Like` / `Viewer Like for {viewer}! +{points}` for `en-GB`. Existing databases that already contain `viewer_like` MUST be adopted without renaming or changing points. After initialization, the row is ordinary user-owned data.

#### Scenario: Fresh Russian database
- **WHEN** social-catalog initialization runs while `admin.time_locale` is `ru-RU` and `viewer_like` is absent
- **THEN** award `viewer_like` exists, is named `Лайк зрителя`, grants 5 points, and is deletable

#### Scenario: Existing viewer_like kept
- **WHEN** an upgraded database already has award id `viewer_like`
- **THEN** its name and points are unchanged

## MODIFIED Requirements

### Requirement: Operator can grant an award from a chat line
`POST /api/awards/grant` SHALL accept `platform`, `user_id`, and `award_id`, plus optional `message_id` and `message_text` from the selected row. The system SHALL resolve the canonical viewer, add the award `points` to all-time, current-session, and current-day `xp`, append one interaction event, and broadcast one award alert. Grant MUST require a non-empty `user_id`. Missing award id or unknown award SHALL fail with HTTP 400. Unknown identity MAY create the viewer the same way ingest does, then apply the award. The server MUST trim `message_text` and limit the transient quote to 280 Unicode code points before broadcast. It MUST NOT persist the quote. Missing source-message fields MUST NOT prevent a valid award grant. Successful viewer `like` commands SHALL reuse the same grant effects for the recipient without calling that HTTP route from the overlay. Buff MUST NOT create an operator grant row for the original award id.

#### Scenario: Grant from a stable message
- **WHEN** the operator grants Advice from a row with `platform`, `user_id`, `message_id`, and message text
- **THEN** XP increases, the interaction event records the message reference, and the award alert includes the bounded transient quote

#### Scenario: Grant joke
- **WHEN** the operator grants Joke to a Twitch user id that already has a viewer
- **THEN** that viewer's XP increases by 10 and one award alert is broadcast

#### Scenario: Grant without a stable message id
- **WHEN** the operator grants an award from a row with a stable viewer identity but no `message_id`
- **THEN** the award succeeds and its alert has no highlightable message reference

#### Scenario: Oversized message snapshot
- **WHEN** a grant includes `message_text` longer than 280 Unicode code points
- **THEN** the award succeeds and the broadcast quote is safely truncated without splitting invalid UTF-8

#### Scenario: Empty user id
- **WHEN** grant is called with an empty `user_id`
- **THEN** the request fails with HTTP 400 and no XP, event, or alert is produced

#### Scenario: Empty platform
- **WHEN** grant is called with an empty `platform`
- **THEN** the request fails with HTTP 400 and no XP, event, or alert is produced

#### Scenario: Unknown award
- **WHEN** grant is called with an absent or unknown `award_id`
- **THEN** the request fails with HTTP 400 and no XP, event, or alert is produced

#### Scenario: Unknown viewer identity
- **WHEN** the platform and user id are valid but no viewer exists yet
- **THEN** the system may create the viewer through the ingest identity path and then apply the award

#### Scenario: Viewer like is not an operator picker grant
- **WHEN** Alice likes Bob via `!like bob`
- **THEN** Reward pickers and `POST /api/awards/grant` are not required
- **AND** Bob still receives one award alert for `viewer_like` when that id is bound
