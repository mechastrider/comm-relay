## Purpose

Shows queued on-stream splashes (avatar, text, sound) in a dedicated OBS Browser Source so chat and leaderboard stay separate.

## ADDED Requirements

### Requirement: Alert page is a transparent themed Browser Source
`GET /overlay/alert` (with and without trailing slash) SHALL serve a transparent page registered before any catch-all `/overlay/` file server. The page SHALL implement every current overlay theme using the same scene preset/theme as other on-stream surfaces. Outside preview, `html` and `body` backgrounds MUST remain transparent.

#### Scenario: Default load
- **WHEN** OBS loads `/overlay/alert`
- **THEN** the page background is transparent and the active overlay theme classes apply

#### Scenario: Theme coverage
- **WHEN** the active preset theme is any supported overlay theme
- **THEN** the alert surface renders with that theme's tokens rather than an unthemed fallback

### Requirement: Splashes are queued and do not preempt
The alert client SHALL show one splash at a time. New `alert` frames SHALL wait in FIFO order until the current splash's duration ends. A new frame MUST NOT replace or cut short a splash already on screen. If the pending queue exceeds 20 waiting items, the client SHALL drop the oldest waiting item (not the visible one).

#### Scenario: Two fires
- **WHEN** `!gg` and an operator award fire one second apart with duration 5 seconds
- **THEN** the second splash starts after the first has finished

#### Scenario: Empty
- **WHEN** no alert is showing or waiting
- **THEN** the page shows no splash chrome

### Requirement: Splash content uses avatar, template text, and a built-in tone
Each alert frame SHALL include `type` `"alert"`, viewer display `name`, `avatar_url` when known, resolved `text`, `points` (0 for command fires), `sound` (a built-in id or empty for silence), and `duration_ms`. The client SHALL render the avatar image when the URL is http(s), otherwise a nameless placeholder. Text SHALL be a text node (no `innerHTML`). Sound SHALL play in this page so OBS can capture it, using the same built-in tone set as admin message sound (`chime`, `ping`, `soft`, `alert`) or silence. Custom image and sound-file values MAY appear as null and MUST be ignored until a later change.

#### Scenario: Command splash
- **WHEN** an alert frame for `!gg` arrives with a viewer avatar and text `Good game, Alice!`
- **THEN** the page shows that avatar and text and plays the configured tone

#### Scenario: Silence
- **WHEN** `sound` is empty
- **THEN** the splash is visual only

### Requirement: Templates resolve on the server
Splash templates MAY contain `{name}` and `{points}`. The server SHALL substitute the canonical or last-seen display name and the numeric points for that event before broadcast. Unknown placeholders SHALL be left unchanged. Command fires SHALL substitute `{points}` as 0.

#### Scenario: Award template
- **WHEN** Advice is granted to a viewer whose display name is `Bob`
- **THEN** the alert `text` contains `Bob` and `50`

### Requirement: Alert client reconnects without restoring old splashes
After load, the alert page SHALL connect to `/ws` and MUST NOT replay historical alerts from HTTP. If the socket drops, it SHALL reconnect with the same backoff family as other overlays. Missed alerts during disconnect are not replayed.

#### Scenario: Reload mid-splash
- **WHEN** OBS reloads `/overlay/alert` during a visible splash
- **THEN** the page starts empty and only shows alerts received after reconnect
