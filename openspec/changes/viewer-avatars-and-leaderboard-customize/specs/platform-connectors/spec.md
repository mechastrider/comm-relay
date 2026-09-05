## ADDED Requirements

### Requirement: YouTube API author photos map into avatar_url
When YouTube connection mode is `api` (or any path that uses Live Chat `AuthorDetails`), the connector SHALL copy a non-empty author `ProfileImageUrl` into the unified message `avatar_url`. Page-mode chat SHALL keep mapping the public page thumbnail when present. Empty photos SHALL omit `avatar_url` so later hub resolution can fill a cached or custom portrait.

#### Scenario: OAuth live chat with photo
- **WHEN** a YouTube API live chat item includes `AuthorDetails.ProfileImageUrl`
- **THEN** the published unified message has that URL as `avatar_url`

#### Scenario: Missing photo
- **WHEN** `ProfileImageUrl` is empty
- **THEN** the unified message omits `avatar_url` and ingest still counts the line
