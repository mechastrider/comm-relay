## Purpose

Let operators attach local images and sounds to award types the same way as commands.

## MODIFIED Requirements

### Requirement: Operator can manage an award-type catalog
The system SHALL persist award types in local SQLite as a list separate from chat commands. Each award type SHALL have a unique id, display name, positive integer `points`, splash text template, built-in sound id or silence, optional `image_asset` and `sound_file` filenames that MAY be null, `sound_volume` 0–100 (default 70), `layout` of `card`, `banner`, or `fullscreen` (default `card`), and splash duration. `GET /api/awards` SHALL list these fields. Mutations SHALL be `POST /api/awards/create`, `POST /api/awards/update`, and `POST /api/awards/delete` with identifiers in the JSON body. Create and update SHALL accept the media, volume, and layout fields. Empty media fields SHALL clear a previous file reference. The operator MUST be able to delete any award type, including seeds.

#### Scenario: Create award
- **WHEN** the operator creates an award named `Clutch` with 25 points
- **THEN** `GET /api/awards` includes it and Reward pickers list it

#### Scenario: Delete seed
- **WHEN** the operator deletes the seeded Joke award
- **THEN** Reward pickers no longer offer Joke and a restart MUST NOT recreate it

#### Scenario: Save custom sound
- **WHEN** the operator updates Joke with a stored `sound_file` filename and `sound_volume` 50
- **THEN** `GET /api/awards` returns those values and a later Joke grant plays that file at 50 percent
