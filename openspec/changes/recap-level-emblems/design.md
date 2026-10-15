## Context
Session ranking already resolves the level from lifetime XP but retains only its title. Immutable recap JSON is captured on first Show recap, not automatically on session end.
## Goals / Non-Goals
Preserve title and emblem together and render the shared badge across admin, OBS, and PNG rankings. Do not change capture timing or achievement rendering.
## Component / Process / IPC Boundaries
Store ranking → capture input → recap snapshot and HTTP session detail. Add optional `emblem` beside `title`; all-time presentation follows the same contract. React uses LevelBadge; static recap renderer uses createLevelBadge.
## State and Event Flow
Resolve from the same level as title within the existing capture transaction. Stored snapshots never consult current levels. Missing emblem means no badge; unknown client values use existing safe shield fallback. New stored emblems must be allowlisted.
## Threading / Async / Cancellation
Existing transactions, cancellation, and visibility broadcasting are unchanged.
## Security and Trust Boundaries
Only built-in SVG geometry; no user SVG or image URL. Accessible names use existing translations.
## Decisions and Alternatives
Use a sibling optional emblem instead of a duplicate level object, preserving existing title consumers. No backfill because historical emblem cannot be reconstructed faithfully.
## Risks / Trade-offs
Legacy snapshots have no icon. PNG must embed shared badge CSS explicitly because export strips CSS imports.
## Migration / Rollout / Rollback
No SQL migration or schema-version bump; old readers ignore the property and new readers accept absent fields.
## Open Questions
None.
