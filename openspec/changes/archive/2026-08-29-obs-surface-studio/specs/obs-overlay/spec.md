## ADDED Requirements

### Requirement: Overlay themes are the on-stream visual language
Registered overlay themes (`default`, `dashboard`, `cockpit_panel`, `cockpit_popups`, `g_rebels_popups`) SHALL define the visual language for every on-stream Browser Source that honors `preset`, not only the chat queue. Chat `/overlay` SHALL keep its existing per-theme message layout (panel versus popups). Other surfaces MUST use the same theme tokens and chrome language and MUST NOT ship an unthemed one-off look.

#### Scenario: Chat theme still selects message layout
- **WHEN** `/overlay?preset=<id>` loads a preset whose theme is `cockpit_popups`
- **THEN** chat messages still render as separate HUD popups

#### Scenario: Same theme id on another surface
- **WHEN** a second on-stream page loads the same preset id
- **THEN** that page uses the same theme id and matching visual language rather than a hardcoded unrelated palette
