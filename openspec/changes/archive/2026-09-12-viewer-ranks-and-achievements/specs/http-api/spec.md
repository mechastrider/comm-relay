## Purpose

Expose bounded local progression reads, POST-action mutations, and isolated preview operations.

## ADDED Requirements

### Requirement: Progression catalogs use local POST-action API contracts
The API SHALL provide `GET /api/progression/levels`, `GET /api/progression/achievements`, and `GET /api/progression/settings` reads. Catalog mutations SHALL use `POST /api/progression/levels/create`, `/update`, `/delete`, `POST /api/progression/achievements/create`, `/update`, `/delete`, and `POST /api/progression/settings/update`, with ids in snake_case JSON bodies. Invalid fields MUST return the existing UI-safe field-error shape and MUST NOT partially persist or reconcile a rule.

#### Scenario: Reject an unsupported metric
- **WHEN** achievement create receives an unknown `metric`
- **THEN** it returns HTTP 400 with a field error and creates no definition or revision

#### Scenario: Delete with an id body
- **WHEN** the operator deletes a non-baseline level
- **THEN** the client posts its `id` to `/api/progression/levels/delete` and no identifier appears in the path

### Requirement: Viewer progression reads do not expose locked secrets
`GET /api/viewers/get` SHALL include current level, next-level progress, unlocked achievements, permitted in-progress achievements, and `progression_alerts_disabled`. `GET /api/viewers` SHALL include only the current level summary and the exclusion flag. Responses MUST omit locked secret definition and progress details.

#### Scenario: Viewer directory read
- **WHEN** the admin lists viewers
- **THEN** each viewer includes a nullable current-level summary without embedding the achievement catalog

### Requirement: Leaderboard reads expose optional level summaries
`GET /api/leaderboard` entries SHALL include a nullable `level` summary with stable id, title, and minimum all-time XP. The addition MUST NOT change rank, period counters, eligibility, or existing fields.

#### Scenario: Existing leaderboard reader
- **WHEN** a client ignores the new `level` member
- **THEN** it can continue reading rank, display name, portrait, XP, and message count unchanged

### Requirement: Progression preview is isolated from production
`POST /api/progression/preview` SHALL accept `kind` `achievement` or `level`, a complete bounded draft presentation, and optional bounded sample viewer data. It MUST publish only a test frame to the existing overlay-debug audience and return `delivered_clients`. It MUST NOT persist catalogs or settings, alter progression, append history, or publish to production `/ws`.

#### Scenario: Preview an unsaved achievement
- **WHEN** a valid achievement preview is posted with one debug receiver connected
- **THEN** the response reports one delivered client and production clients receive nothing
