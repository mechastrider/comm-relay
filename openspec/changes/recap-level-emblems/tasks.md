# Implementation Slices
## Slice: Historical recap level badges
> **Outcome**: Consistent badges with immutable captured level metadata.
> **Acceptance**: Go store/recap/API and browser regressions, frontend checks.
> **Skills**: comm-relay-backend-golang, golang-tests, api-conventions, web-static-frontend, changelog.
> **Scope**: Recap rankings, data mapping, admin, static renderer and PNG styles.
> **Allowed fallout**: Tests, fixtures, specs and changelog.
> **Blocked**: Unrelated features, signing and releases.
- [x] 1.1 Preserve optional ranking emblem and historical compatibility.
- [x] 1.2 Render badges in admin, OBS and PNG with regression coverage.
## Gate: qa
- [x] Q.1 Run checks and record coverage.
## Gate: review
- [x] R.1 Review final diff and synchronize specs.
## Gate: distribution-readiness
- [x] D.1 Verify frontend/Go build compatibility without publishing a release.
