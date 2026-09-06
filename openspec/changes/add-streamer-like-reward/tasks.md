## 1. Backend Starter Catalog

- [x] 1.1 Add localized `like` starter definitions with 5 points, `soft` sound, and 5000 ms duration, and change fresh-catalog Advice to 25 points; verify focused starter-catalog tests pass.
- [x] 1.2 Extend store tests for both locales, interrupted fresh bootstrap, and existing-catalog adoption so they prove no seed insertion or points rewrite occurs after initialization; verify `go test ./internal/store` passes.

## 2. Frontend Emblem

- [x] 2.1 Add the stable `like` mapping and themeable outlined thumbs-up with four-point sparkle to the shared alert emblem module; verify live and preview consumers still use the shared renderer.
- [x] 2.2 Extend emblem unit tests to cover the `like` semantic symbol, generic fallback stability, and decorative SVG output; verify `npm test -- --runInBand` or the repository's focused frontend test command passes.

## 3. Documentation and Product Contract

- [x] 3.1 Update Russian product documentation to list “Лайк от стримера” at 5 XP and Advice at 25 XP for newly initialized catalogs, explicitly noting that existing catalogs remain unchanged; verify related documentation references are consistent.
- [x] 3.2 Add a concise Russian bullet under `CHANGELOG.md` `[Unreleased]` describing the new fresh-catalog reward and compatibility rule; verify existing release sections are untouched.
- [x] 3.3 Sync the approved delta into canonical `operator-rewards` and `overlay-alerts` specs after implementation; verify `openspec validate add-streamer-like-reward --strict` succeeds.

## 4. Verification

- [x] 4.1 Run `gofmt` or `goimports` on touched Go files and verify `git diff --check` reports no whitespace errors.
- [x] 4.2 Run `go test ./...` and `golangci-lint run ./...`; record any environment or pre-existing failures separately from change regressions.
- [x] 4.3 Run `npm run lint` and the frontend test suite, then smoke-check an alert preview without custom media to confirm the Like emblem is readable and the page remains transparent.
- [x] 4.4 Review `git diff` to confirm the change contains no SQL migration, no post-bootstrap catalog rewrite, and no unrelated edits.
