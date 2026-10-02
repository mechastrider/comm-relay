## Context
Audit: docs/research/visual-audit-2026-10-02/visual-audit.md. User approved the recommended geometry, semantic colors and sections.
## Goals
One visual contract for ordinary actions, fields and form sections. Apply across admin, retaining task-specific page compositions.
## Non-Goals
Backend, APIs, workflows, OBS/dock surfaces, library replacement and data migrations.
## Component / Process / IPC Boundaries
Small React Button/IconButton, Field and FormSection primitives own reusable markup. Shared CSS owns visual values; feature CSS owns layout. Existing class consumers remain supported while migrated. Catalog field domain logic stays in catalog.
## State and Event Flow
Keep all controlled field values, names, IDs, handlers, form associations and request payloads. Group wrappers are presentation/semantics only.
## Threading / Async / Cancellation
No changes; preserve busy guards, cancellation, preview and dirty-navigation handling.
## Security and Trust Boundaries
No changes to HTML rendering, URL policy, file upload or desktop bridge.
## Decisions
Use 38px/12px actions and 44px narrow targets; emphasis changes colors only. Keep physical gradients. Neutral thin borders and small radii define form sections. Heading roles use 14px workspace/panel and 12px section/label; body stays legible in context. Chips and selectable cards are distinct variants. Preserve compact message-row actions to avoid changing streaming density; they are not ordinary form/toolbar actions.
Consolidate base CSS rather than adding a final high-specificity override sheet. Introduce modest reusable components instead of a universal schema-driven form. Preserve existing task layouts.
## Decisions and Alternatives
A new UI kit would replace the accepted visual identity and inflate scope. CSS-only fixes would leave duplicated markup/semantics; use shared components for recurring boundaries as well.
## Risks / Trade-offs
Larger catalog actions may wrap in narrow headers; use flex wrapping and independently scrollable bodies. Test inherited upload-label styles, Studio preset row width, dialog footers and RU/EN. Do not give every nested field a card border.
## Migration / Rollout / Rollback
Static frontend rebuild; no data migration. Revert this change to roll back. Sync canonical specs after verification; no release publication.
## Open Questions
None blocking. Native packaged smoke must be reported separately if unavailable.

## Follow-up: tooltip readability
Ordinary action `overflow-wrap: anywhere` was inherited by auto-width absolute tooltips, reducing their intrinsic width to individual letters. Shared tooltips now use max-content width capped at min(280px, 70vw), normal word breaking, no automatic hyphenation and emergency break-word wrapping for oversized tokens. Live and Audience toolbar hints align to the action's right edge at all viewport widths. Regression checks measure each rendered word, viewport bounds and hover/keyboard visibility in both configured languages.
