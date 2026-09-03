## Purpose

Make alert presentation fit the configured OBS rectangle and allow realistic isolated queue tests.

## ADDED Requirements

### Requirement: Alert chrome fills the Browser Source rectangle

The alert root and its primary themed chrome MUST size from the complete Browser Source viewport, minus theme-safe inner padding, without an intrinsic narrow viewport maximum width. Content MUST wrap, align, and clip or fade inside that rectangle while the page outside the chrome remains transparent.

#### Scenario: Wide alert source
- **WHEN** an alert is shown in a wide landscape rectangle
- **THEN** its primary chrome expands across the available rectangle instead of remaining a centered narrow card

#### Scenario: Portrait or narrow alert source
- **WHEN** the same theme is shown in a portrait or narrow rectangle
- **THEN** its content reflows without clipped borders, page scrollbars, or a fixed aspect-ratio assumption

### Requirement: Dedicated alert test page preserves production queue behavior

`GET /overlay/test/alert` MUST connect only to `/ws/overlay-debug`, MUST NOT subscribe to production alert frames, and MUST enqueue test alert frames through the production renderer. On `debug_reset` it MUST clear the visible splash, pending queue, transient timers, and dedupe state. Normal `/overlay/alert` behavior MUST remain unchanged.

#### Scenario: Test simultaneous alert kinds
- **WHEN** an alert-burst scenario sends command and award alerts
- **THEN** its command, award, command sequence follows the same bounded, non-preempting queue rules as production alerts
- **AND** the award alert includes its sample source message
