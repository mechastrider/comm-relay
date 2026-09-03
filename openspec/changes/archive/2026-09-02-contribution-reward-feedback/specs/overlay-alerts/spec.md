## Purpose

Give operator awards a distinct, contextual on-stream presentation and prevent command bursts from delaying them behind stale entertainment alerts.

## MODIFIED Requirements

### Requirement: Splashes are queued and do not preempt

The alert client SHALL show exactly one splash at a time and MUST NOT replace or cut short the visible splash. Pending award and command alerts SHALL keep FIFO order within separate lanes. After the visible splash ends, the oldest pending award SHALL run; when no award waits, the oldest non-expired command SHALL run. A command waiting for more than 10 seconds SHALL expire. The total pending capacity SHALL remain 20. At capacity, a new award SHALL displace the oldest pending command when one exists, otherwise the oldest pending award; a new command SHALL replace the oldest pending command but MUST NOT displace an award. An alert without a recognized `source` SHALL use command scheduling for compatibility.

#### Scenario: Award arrives behind a visible command
- **WHEN** one command is visible, two commands wait, and an award arrives
- **THEN** the visible command finishes and the award is shown before either waiting command

#### Scenario: Two fires
- **WHEN** two alerts arrive one second apart with duration 5 seconds
- **THEN** the first remains visible for its duration and the next eligible pending alert starts afterward

#### Scenario: Empty
- **WHEN** no alert is visible or waiting
- **THEN** the page shows no splash chrome

#### Scenario: Command loses context
- **WHEN** a pending command has waited more than 10 seconds
- **THEN** it is removed without being shown or playing sound

#### Scenario: Full award-protected queue
- **WHEN** all 20 pending items are awards and a command arrives
- **THEN** the incoming command is discarded and no award is removed

## ADDED Requirements

### Requirement: Award splashes explain the recognized contribution

Command and award splashes SHALL use distinct variants in every supported overlay theme. An award splash SHALL render the award name, viewer name, positive points, and optional short source-message quote as text nodes. A command splash SHALL retain its existing resolved template presentation. Missing quote or avatar data MUST fall back without empty reserved space. Reduced-motion mode SHALL replace decorative award motion with a static emphasis.

#### Scenario: Award with quote
- **WHEN** an award alert contains `award_name` `Spotter`, `points` 25, and a message quote
- **THEN** the alert visibly identifies Spotter, the viewer, `+25`, and the quote without HTML interpretation

#### Scenario: Award without quote
- **WHEN** an award alert has no message text
- **THEN** the award variant shows its name, viewer, and points without an empty quote container

### Requirement: Alert chrome uses its surface opacity

The alert page SHALL resolve panel opacity from `surfaces.alerts.panel_opacity`, normally falling back to the preset shared `style.panel_opacity`. When a legacy cockpit preset has shared zero and no alerts override, alert chrome SHALL retain that theme's historical glass color and alpha; an explicit alerts value, including zero, SHALL win. It MUST apply the resolved appearance to alert background/chrome rather than the whole document, text, avatar, or media. The page background MUST remain transparent outside preview.

#### Scenario: Translucent alert chrome
- **WHEN** the active preset has alert panel opacity `0.35`
- **THEN** alert chrome uses 35 percent opacity while its text remains fully rendered and the page stays transparent

#### Scenario: Untouched legacy cockpit alert
- **WHEN** a cockpit preset has shared opacity `0` and no alerts opacity override
- **THEN** alert chrome retains that theme's historical dark glass while the page outside it stays transparent
