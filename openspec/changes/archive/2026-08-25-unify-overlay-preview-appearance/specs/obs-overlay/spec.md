## ADDED Requirements

### Requirement: Platform icon sits with the display name
When the platform marker is `icon` or `both`, the overlay SHALL render the platform icon immediately before the display name inside the message identity, in every supported theme. The icon MUST NOT occupy a leftover grid cell (for example under the avatar) in HUD themes.

#### Scenario: HUD popup with icon marker
- **WHEN** the theme is `cockpit_popups` or `g_rebels_popups` and the platform marker is `icon` or `both`
- **THEN** the platform icon appears on the same row as the display name, immediately before it

#### Scenario: Stripe hides the icon
- **WHEN** the platform marker is `stripe` or `none`
- **THEN** the platform icon is not shown

### Requirement: G-Rebels default platform marker includes the icon
New presets and theme-default style for `g_rebels_popups` SHALL use platform marker `both`. Existing presets that already stored a marker MUST keep that stored value.

#### Scenario: New G-Rebels preset
- **WHEN** the operator creates a preset with theme `g_rebels_popups` without overriding the platform marker
- **THEN** the marker is `both`

### Requirement: Preview backgrounds are a shared contrast set
When `/overlay` is loaded with a preview query, `preview_background` SHALL apply the same page backdrop for every theme: `white`, `checker`, `scene`, or `dark`. Legacy value `busy` SHALL be treated as `scene`. Missing or invalid values SHALL use `scene`. Outside preview, `html` and `body` backgrounds MUST remain transparent. Theme chrome MAY still cover parts of the backdrop.

#### Scenario: White preview backdrop
- **WHEN** the overlay URL includes a preview flag and `preview_background=white`
- **THEN** the page backdrop is solid white behind transparent overlay regions

#### Scenario: Legacy busy query
- **WHEN** the overlay URL includes a preview flag and `preview_background=busy`
- **THEN** the page backdrop is the same game-footage pattern as `scene`

#### Scenario: HUD theme preview fills the rectangle
- **WHEN** the theme is `cockpit_popups` or `g_rebels_popups` and preview uses `preview_background=scene`
- **THEN** the game-footage backdrop fills the Browser Source rectangle behind transparent HUD regions rather than the browser default white page

#### Scenario: Live OBS overlay
- **WHEN** `/overlay` loads without a preview query
- **THEN** the page background stays transparent
