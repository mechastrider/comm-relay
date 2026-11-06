# Implementation Slices
## Slice: Automatic desktop message notifications
> **Outcome**: enabled message tones play without initial click in the desktop shell.
> **Acceptance**: unit, browser and native WebKit startup checks.
> **Skills**: comm-relay, web-static-frontend, comm-relay-backend-golang, changelog.
> **Scope**: message sound service, shell bridge, narrow Wails bindings.
> **Allowed fallout**: tests, shared tone helper, specs and changelog.
> **Blocked**: command audio redesign, Wails migration, release publication.
- [x] 1.1 Implement native shell playback and browser fallback.
- [x] 1.2 Add bridge/lifecycle regression tests and user-facing documentation.
## Gate: qa
- [x] Q.1 Execute qa_plan and record evidence and unavailable platform checks.
## Gate: review
- [x] R.1 Review diff and resolve defects.
## Gate: distribution-readiness
- [x] D.1 Build desktop binary and document manual release smoke gaps.
