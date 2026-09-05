## ADDED Requirements

### Requirement: Audience directory shows viewer portraits
Each Audience viewer row SHALL show a compact portrait beside the display name. The image SHALL use the list `avatar_url` when present, with `referrerPolicy` `no-referrer`. When `avatar_url` is missing or the image errors, the row SHALL show a deterministic initials (or equivalent) fallback that does not reserve a blank hole. The portrait MUST be decorative (`alt` empty, `aria-hidden` on the image) so the name button remains the accessible control.

#### Scenario: Cached face in the table
- **WHEN** a list row includes `avatar_url` `/overlay/assets/asset_ab12cd.png`
- **THEN** the Viewer cell shows that image beside the name

#### Scenario: Broken image fallback
- **WHEN** the portrait URL fails to load
- **THEN** the row shows the initials fallback and keeps the name button usable

### Requirement: Viewer card manages custom portrait and ranking visibility
The viewer card SHALL show the resolved portrait, a file control to upload a custom portrait, a control to clear it when one is stored, and a checkbox (or equivalent) to hide the viewer from the leaderboard. Upload SHALL call `POST /api/viewers/avatar/upload`. Clear SHALL call `POST /api/viewers/avatar/clear`. Hide SHALL persist through `POST /api/viewers/update` with `leaderboard_hidden`. Existing display-name and merge controls remain. Upload errors SHALL surface on the card without leaving the inspector.

#### Scenario: Upload from the card
- **WHEN** the operator chooses a PNG on a known viewer and the upload succeeds
- **THEN** the card and table show the new portrait without a full page reload

#### Scenario: Hide from leaderboard
- **WHEN** the operator checks hide-from-leaderboard and the save succeeds
- **THEN** Live and OBS leaderboards omit that viewer while the Audience row remains

### Requirement: Settings can disable custom portraits
Settings SHALL offer a boolean control for `custom_avatars_enabled`, saved through `POST /api/config/update`. When the flag is false, Audience, overlay, alerts, and leaderboard SHALL ignore stored custom files and use cache or last-seen remote URLs. The control MUST be labeled so the operator understands it disables custom portraits, not platform cache.

#### Scenario: Disable custom
- **WHEN** the operator turns custom portraits off and saves
- **THEN** a viewer with both custom and cached files is shown with the cached platform portrait

### Requirement: Studio leaderboard inspector edits title and rank cap
When the selected Studio surface is leaderboard, the inspector SHALL include a title field (`surfaces.leaderboard.title`) and a max-entries field (`surfaces.leaderboard.max_entries`, integer 1–20, default 5). Both SHALL persist with Publish like other leaderboard surface fields. A blank title SHALL preview as no heading. The Essentials view MAY show these fields; they MUST remain in All settings. Live Messages, dock, and overlay chat SHALL render `avatar_url` from `/ws` the same way as today, including local `/overlay/assets/` URLs.

#### Scenario: Set overlay heading
- **WHEN** the operator types `Топ эфира` as the leaderboard title and publishes
- **THEN** the Studio leaderboard preview and `/overlay/leaderboard` show that heading

#### Scenario: Cap at three
- **WHEN** the operator sets max entries to 3 and publishes
- **THEN** the preview and live ranking show at most three rows
