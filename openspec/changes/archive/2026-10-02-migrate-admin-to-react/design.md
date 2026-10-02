## Context
The approved plan replaces the complete admin, preserving its current appearance and all existing product contracts. The baseline Node suite passes 64 checks. Browser characterization must precede replacement.

## Goals / Non-Goals
Deliver one React admin with feature parity, strict TypeScript, reproducible production builds, and browser regression. No UI redesign, new product features, persistence migration, or OBS/dock rewrite. The deliberately absent Studio test panel stays absent under OQ-002; dedicated test routes/API remain available.

## Component / Process / IPC Boundaries
One React root in web/admin/src. Workspace components, shared controls, pure models, and typed services have separate ownership. The Go runtime and Wails bridge retain their interfaces. Native QA found that top-level HTTP navigation discarded the Wails JS runtime; the shell now retains the runtime and hosts the loopback admin in a full-window iframe. A one-shot MessageChannel forwards only SavePNGFile, with exact admin origin and source-frame validation. Browser-only runs retain anchor download. OBS surfaces remain separate static documents. Reuse shared pure helpers and translations; do not mount the old admin controllers behind React.

## State and Event Flow
Server snapshots, per-section Settings drafts, Studio drafts, and local preferences remain separate. Providers preserve shared period, Live tab, messages and contract drafts across navigation. Settings/Studio/Audience editors own independent drafts and require explicit discard before leaving their owner. Settings Save merges its section into fresh server config; Studio Publish updates appearance; hot activation is immediate. One WebSocket dispatches typed events and triggers scoped reconciliation after reconnect.

## Threading / Async / Cancellation
Abort obsolete requests and ignore stale completions. Effects clean up listeners, sockets, and timers. Guard repeated mutations and preserve errors in the affected region. StrictMode must not duplicate messages or mutations.

## Security and Trust Boundaries
Render user content as text; preserve safe media URL handling and centralized desktop-save. Test with disposable data and disabled connectors. Never use production credentials or databases. No new production test endpoints.

## Decisions and Alternatives
React 19, TypeScript, Vite, and hash React Router align with sibling projects. Keep CSS and translations to isolate migration risk. Use reducers/context instead of adding a global store. Build to web/admin/dist using the root npm lockfile. Embed compiled assets and build frontend before Go/Wails. Test real embedded production assets rather than relying on dev-server checks.

## Risks / Trade-offs
Highest risks are draft reconciliation, UI parity, rich messages, iframe previews, media/export, and native bridge behavior. Characterization tests and the feature inventory gate removal of legacy code. Browser WebKit is not proof of Wails execution.

## Migration / Rollout / Rollback
Implement within one change, replacing all admin controllers before delivery. Preserve existing links, API shapes, local preferences, config and database. Roll back through the prior binary without data conversion. Update CI, release jobs, dev commands and contributor instructions together.

## Open Questions
None blocking. User selected UI preservation and native verification only where the environment is available. Unavailable native/platform checks must be explicitly reported.
