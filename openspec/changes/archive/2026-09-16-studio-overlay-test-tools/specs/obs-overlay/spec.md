## Purpose

Define the chat overlay's full-frame layout and isolated test-mode behavior.

## ADDED Requirements

### Requirement: Chat surface root fills the Browser Source rectangle

The chat overlay's top-level runtime container MUST occupy the complete Browser Source viewport with transparent page background, border-box sizing, and clipped outer overflow at any supported aspect ratio. Individual chat messages MUST remain content-sized and bottom-anchored according to the selected theme.

#### Scenario: Resize the Browser Source
- **WHEN** the chat source is rendered in landscape, square, portrait, or narrow-banner rectangles
- **THEN** the surface root follows all four viewport edges without scrollbars or a fixed aspect-ratio assumption
- **AND** message cards are not stretched to fill the frame

### Requirement: Dedicated chat test page uses the production frame renderer

`GET /overlay/test/chat` MUST connect only to `/ws/overlay-debug`, MUST NOT subscribe to production content, and MUST render compatible test frames through the production message and award-feedback paths. On `debug_reset` it MUST clear test rows, reward feedback, transient timers, and dedupe state. Normal `/overlay` behavior MUST remain unchanged.

#### Scenario: Test a rewarded message
- **WHEN** a `rewarded_message` sequence arrives
- **THEN** the message appears and receives the same transient reward feedback as a visible production message
- **AND** no live message is shown in the test source
