## Purpose

Render aggregated achievement and level recognition in the existing alert Browser Source.

## ADDED Requirements

### Requirement: Alert overlay renders progression recognition
`/overlay/alert` SHALL consume `viewer_progression` frames as one aggregated splash. The splash SHALL identify the viewer and show every included achievement plus the new title when present, using localized text nodes, the resolved viewer portrait or stable built-in progression emblem, active alert theme, shared progression layout, sound, volume, and duration. It MUST remain readable without media and MUST use static emphasis under reduced motion.

#### Scenario: Combined unlock card
- **WHEN** a frame contains a new Veteran title and two achievements
- **THEN** one splash identifies the viewer, title, and both achievements without creating three queued cards

#### Scenario: Level only
- **WHEN** a frame contains a level transition and no achievements
- **THEN** the splash renders a distinct level-up variant without empty achievement space

### Requirement: Progression alerts use protected queue scheduling
Progression splashes SHALL use the protected lane with awards and contracts, MUST NOT preempt the visible splash, and MUST NOT expire while pending. Within that lane existing arrival order SHALL be preserved, including the source alert preceding its derived progression alert. At capacity, a progression alert MAY displace the oldest low-priority command or greeting but MUST NOT displace an older protected alert.

#### Scenario: Progression arrives behind an award
- **WHEN** an award is visible and its derived progression frame arrives
- **THEN** the award finishes before the progression splash begins
