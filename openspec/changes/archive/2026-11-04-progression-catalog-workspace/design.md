## Context

The React progression controller already owns separate drafts and API resources; its view combines two catalog/forms and a bottom settings card. Neighbouring catalogs use a list/editor pattern. The generated CLI context describing a vanilla admin is stale; follow the actual React implementation and AGENTS.md.

## Goals / Non-Goals

Provide the agreed catalog navigation and reachable settings. Preserve API, evaluation, revision semantics and baseline protections. No backend, overlay, IPC or persistence changes.

## Component / Process / IPC Boundaries

Keep API operations in Progression. Split the large view into focused field components and a workspace shell. Reuse Button and Dialog and existing catalog styling.

## State and Event Flow

Track selected catalog, compact editor visibility and settings-dialog visibility in the controller. Guard transitions using existing per-group draft comparison. Keep selections and filters when changing catalog. Clear only the discarded group's draft. Scope feedback to its operation group; show loading failures with retry in the workspace.

## Threading / Async / Cancellation

Use existing request serialization and busy controls. Block navigation and dialog dismissal while a mutation is pending. Preserve drafts on failures. No new background work.

## Security and Trust Boundaries

Existing local API and React escaping apply. No new data or network destinations.

## Decisions and Alternatives

Use two catalog choices plus a labelled Alerts button: settings are shared configuration rather than a third catalog. A three-tab approach is viable but not the agreed direction. Use native modal focus management and the shared confirmation dialog. Keep narrow list/editor state explicit rather than stacking both long forms.

## Risks / Trade-offs

Switching catalogs costs a click; dirty navigation and nested confirmation focus require browser regressions. Short-window dialogs must keep footer actions visible. Avoid leaking one editor's success/error into another.

## Migration / Rollout / Rollback

Ship with the normal admin build. No migration; revert the UI commit if necessary.

## Open Questions

None blocking. Browser QA cannot substitute for a packaged Wails smoke test.
