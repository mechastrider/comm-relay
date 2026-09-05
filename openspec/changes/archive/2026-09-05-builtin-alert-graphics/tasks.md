## 1. Backend

- [x] 1.1 Preserve the existing alert payload and persistence contracts, and verify command `trigger`, award `award_id`, and custom `image_asset` coverage with `go test ./internal/api/... ./internal/store/...`.

## 2. Frontend

- [x] 2.1 Add a shared deterministic emblem model and safe SVG/DOM builder for seeded and operator-created commands and awards; verify semantic mappings, generic stability, monograms, and decorative accessibility in JavaScript unit tests.
- [x] 2.2 Integrate built-in emblems into `/overlay/alert` with custom-image priority, load-error fallback, item scaling for both visual sources, and unchanged queue behavior; verify `web/alert/alert-render.test.js`, `web/alert/alert-media.test.js`, and `web/alert/alert-lifecycle.test.js` pass.
- [x] 2.3 Style command signals and award medals across every current alert theme and `card`, `banner`, and `fullscreen` layouts, including reduced motion and narrow Browser Source rectangles; verify with the alert sample/test surface.
- [x] 2.4 Reuse the shared emblem in command and award catalog image previews, return to it immediately after Clear, and update EN/RU helper copy; verify catalog media tests and `npm run test:i18n` pass.

## 3. Docs

- [x] 3.1 Update the existing `[Unreleased]` alert-media bullet in `CHANGELOG.md` to describe automatic built-in graphics and custom-file override without adding implementation details.
- [x] 3.2 Sync the `overlay-alerts` and `admin-and-dock` delta requirements into canonical specs after implementation and verify the resulting requirements match observable behavior.

## 4. Verification

- [x] 4.1 Install frontend dependencies once with `npm ci`, then run `npm test`, `npm run test:i18n`, and `npm run lint`.
- [x] 4.2 Run backend and repository checks with `go test ./...`, `golangci-lint run ./...`, and `go build ./...`.
  - Production packages report 0 lint issues; the all-package lint also reports two pre-existing issues in the ignored local helper `var/import-jake-pack/main.go`.
- [x] 4.3 Run `openspec validate builtin-alert-graphics --strict` and `git diff --check`.
- [x] 4.4 Smoke-check seeded and generic command/award emblems, custom upload/clear/error fallback, all three layouts, all current themes, reduced motion, and landscape, square, portrait, and narrow-banner Browser Source rectangles.
  - Automated DOM/CSS smoke coverage and the live overlay-debug WebSocket surface passed; headless Edge did not produce a screenshot in this environment.
