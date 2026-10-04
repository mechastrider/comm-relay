## 1. Frontend

- [x] 1.1 Share the white/orange Comm-Relay wordmark across header, About, and error heading; verify typography against Mech-Comm source.

## 2. Docs

- [x] 2.1 Record the visible change in Unreleased; review the diff to preserve released history.
- [x] 2.2 Sync the wordmark requirement into the canonical admin design system spec and run `openspec validate align-wordmark-with-mech-comm --strict`.

## 3. Verification

- [x] 3.1 Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
- [x] 3.2 Run `npm run test:e2e -- --project=chromium web/e2e/admin.spec.ts`, `go test ./internal/api`, and `golangci-lint run ./...`; inspect desktop and narrow wordmark rendering.

Verification: all frontend checks passed (204 surface tests and 30 unit tests, with TZ=UTC for the existing date assertion). Five Chromium admin regressions passed using `--config=var/wordmark-playwright.config.ts` to launch the downloaded full Chromium executable because the headless-shell download failed certificate validation. Header, About, and 390px header screenshots inspected. API Go tests passed. Go lint was attempted but could not run: the installed linter was compiled with Go 1.26 while the project requires 1.27.1. No Go source changed.
