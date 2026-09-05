## Purpose

Let operators attach local images and sounds to chat commands and choose how the splash is composed.

## MODIFIED Requirements

### Requirement: Operator can manage a command catalog
The system SHALL persist chat commands in local SQLite (not `config.json`). Each command SHALL have a unique trigger slug, enabled flag, per-viewer cooldown seconds, splash text template, built-in sound id or silence, optional `image_asset` and `sound_file` filenames that MAY be null, `sound_volume` 0–100 (default 70), `layout` of `card`, `banner`, or `fullscreen` (default `card`), and splash duration. `GET /api/commands` SHALL list these fields. Mutations SHALL be `POST /api/commands/create`, `POST /api/commands/update`, and `POST /api/commands/delete` with identifiers in the JSON body. Create and update SHALL accept `image_asset`, `sound_file`, `sound_volume`, and `layout`. Empty media fields SHALL clear a previous file reference. The operator MUST be able to delete any command, including seeds.

#### Scenario: Create command
- **WHEN** the operator creates a command with trigger `lurk`
- **THEN** `GET /api/commands` includes that command and chat line `!lurk` can match it after save

#### Scenario: Delete seed
- **WHEN** the operator deletes the seeded `gg` command
- **THEN** `!gg` no longer matches and a process restart MUST NOT recreate it

#### Scenario: Duplicate trigger rejected
- **WHEN** the operator creates a second command with trigger `gg` while `gg` exists
- **THEN** the request fails with HTTP 400 and a field error on the trigger

#### Scenario: Save custom image
- **WHEN** the operator updates `gg` with a stored `image_asset` filename
- **THEN** `GET /api/commands` returns that filename and a later `!gg` alert uses it

## ADDED Requirements

### Requirement: Command media filenames are stored assets only
`image_asset` and `sound_file` SHALL be empty or a generated overlay-asset filename already stored beside `config.json`. The system MUST reject absolute paths, `..`, URLs, and names that fail the existing overlay asset name check.

#### Scenario: Path rejected
- **WHEN** create or update sets `image_asset` to `C:\\photos\\gg.png`
- **THEN** the request fails with HTTP 400 and a field error on `image_asset`
