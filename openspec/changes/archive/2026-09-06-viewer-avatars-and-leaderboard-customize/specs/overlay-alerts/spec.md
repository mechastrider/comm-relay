## ADDED Requirements

### Requirement: Alert frames carry the resolved viewer portrait
Award and command alert `avatar_url` SHALL use the same resolved portrait as viewer list and chat fill (custom overlay-asset URL when custom portraits are enabled, otherwise cached local URL, otherwise last-seen remote URL). Absence of a portrait SHALL omit `avatar_url`. Primary splash graphics remain custom `image_asset` or the built-in emblem as already specified; resolved `avatar_url` is for identity chrome only.

#### Scenario: Award without custom alert image uses resolved portrait in identity chrome
- **WHEN** Advice is granted to a viewer who has a cached platform portrait and no award `image_asset`
- **THEN** the splash uses the built-in medal as the primary graphic and `avatar_url` is the local cached portrait URL when identity chrome needs it
