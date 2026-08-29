## Purpose

Lets the operator define award types and grant them from a live chat line in admin or the OBS dock, adding score and an on-stream alert.

## ADDED Requirements

### Requirement: Operator can manage an award-type catalog
The system SHALL persist award types in local SQLite as a list separate from chat commands. Each award type SHALL have a unique id, display name, positive integer `points`, splash text template, built-in sound id or silence, optional reserved media fields that MAY be null, and splash duration. `GET /api/awards` SHALL list them. Mutations SHALL be `POST /api/awards/create`, `POST /api/awards/update`, and `POST /api/awards/delete` with identifiers in the JSON body. The operator MUST be able to delete any award type, including seeds.

#### Scenario: Create award
- **WHEN** the operator creates an award named `Clutch` with 25 points
- **THEN** `GET /api/awards` includes it and Reward pickers list it

#### Scenario: Delete seed
- **WHEN** the operator deletes the seeded Joke award
- **THEN** Reward pickers no longer offer Joke and a restart MUST NOT recreate it

### Requirement: First migrate seeds Joke and Advice
On the migration that introduces award types, the system SHALL insert deletable seeds: Joke with `points` 10 and Advice with `points` 50, with splash templates that include `{name}` and `{points}`. Seeds MUST NOT be re-inserted on later startups.

#### Scenario: Fresh database
- **WHEN** CommRelay starts against a database that just applied this migration
- **THEN** Joke (+10) and Advice (+50) exist and both are deletable

### Requirement: Operator can grant an award from a chat line
`POST /api/awards/grant` SHALL accept JSON identifying the chat line's `platform` and `user_id` plus `award_id`. The system SHALL resolve the canonical viewer, add `points` to that viewer's `score` for all-time, current session, and current stats day, enqueue one alert, and append an interaction event. Grant MUST require a non-empty `user_id`. Missing award id or unknown award SHALL fail with HTTP 400. Unknown identity MAY create the viewer the same way ingest does, then apply the award.

#### Scenario: Grant joke
- **WHEN** the operator grants Joke to a Twitch user id that already has a viewer
- **THEN** that viewer's `score` increases by 10 and an alert is enqueued

#### Scenario: Empty user id
- **WHEN** grant is called with an empty `user_id`
- **THEN** the request fails with HTTP 400 and score is unchanged

### Requirement: The same chat line may be rewarded more than once
The system MUST NOT reject a second grant because the same message `id` was already rewarded. Each successful grant SHALL add points and enqueue another alert.

#### Scenario: Joke then advice
- **WHEN** the operator grants Joke and then Advice on the same message
- **THEN** score increases by 10 then by 50 and two alerts are queued in order

### Requirement: Reward controls appear on lines with a stable identity
Admin Live messages and `/dock/messages` SHALL offer a Reward control when the line has a non-empty `platform` and `user_id`. The control SHALL open a short picker of award types (not one button per type on the row). Choosing a type SHALL call `POST /api/awards/grant`. Lines without `user_id` MUST NOT show Reward. The dock MUST NOT offer command or award catalog editing.

#### Scenario: Dock reward
- **WHEN** a Twitch message with `user_id` is shown in the dock and the operator picks Advice
- **THEN** the client posts grant with that platform, user id, and the Advice id

#### Scenario: No identity
- **WHEN** a displayed line has no `user_id`
- **THEN** Reward is not offered
