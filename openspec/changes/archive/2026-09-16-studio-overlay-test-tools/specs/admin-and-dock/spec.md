## Purpose

Document shipped overlay-debug backend and dedicated test surfaces while Studio interactive test controls remain deferred pending [OQ-002](../../../docs/open-questions.md#oq-002-тестовые-сценарии-overlay--изоляция-ui-и-эфирные-источники-2026-09-05).

## ADDED Requirements

### Requirement: Dedicated overlay test surfaces work without Studio test panel

Dedicated pages at `/overlay/test/chat`, `/overlay/test/leaderboard`, and `/overlay/test/alert` SHALL connect only to `/ws/overlay-debug` and MUST NOT subscribe to production `/ws`. The local actions `POST /api/overlay-debug/scenario/fire` and `POST /api/overlay-debug/session/reset` SHALL remain available with the typed validation defined in http-api. As of 2026-09-05 the Studio test-mode toggle, scenario panel, and in-Studio URL copy for debug scenarios are **not** present in admin markup; restoring them requires an explicit product decision under OQ-002. Operator documentation SHALL describe how to configure OBS Browser Sources on the dedicated test paths and invoke scenarios through the local API until Studio controls return.

#### Scenario: Test alert surface is fail-closed
- **WHEN** OBS loads `/overlay/test/alert` while production alert sources use `/overlay/alert`
- **THEN** the test source receives only debug-channel frames and appearance settings
- **AND** production sources receive no debug frames

#### Scenario: API scenario without Studio UI
- **WHEN** a client posts a valid scenario to `/api/overlay-debug/scenario/fire` with one connected debug socket
- **THEN** the response reports `delivered_clients` of one
- **AND** no product repository or config mutation occurs

### Requirement: Production OBS URL copy remains unchanged

Existing Studio and setup copy actions for production `/overlay`, `/overlay/leaderboard`, `/overlay/alert`, `/overlay/recap`, and `/dock/messages` MUST remain available and MUST NOT be replaced by test-only URLs in those primary controls.

#### Scenario: Production chat URL copy
- **WHEN** the operator copies the primary chat Browser Source URL from Studio setup
- **THEN** the URL uses `/overlay` or pinned `?preset=` forms
- **AND** does not use `/overlay/test/chat`
