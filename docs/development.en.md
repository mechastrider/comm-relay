# CommRelay development

**Language / Язык:** [English](development.en.md) · [Русский](development.md)

This document covers local development, desktop builds, and the release workflow. For installation and OBS setup, see the [README](../README.en.md).

## Requirements

- **Go 1.27.1+** — pinned in [`go.mod`](../go.mod).
- **Node.js 24+** — required to build the React admin and run frontend checks; installed applications do not need Node.
- [Task](https://taskfile.dev/) — recommended for the complete development loop.
- [Wails v2](https://wails.io/) — required only for desktop builds.

Admin, OBS dock, and overlay static assets are embedded in the binary. During local development they can be overridden with files from `web/`.

The admin lives in `web/admin/src/` (React, TypeScript, hash router). `npm run build` creates `web/admin/dist/`; **run it before direct Go builds**. Only compiled assets are served and embedded. Disk mode (`-web ./web`) also serves the compiled admin from `dist/`, so rebuild after edits. OBS overlays and docks remain static HTML/CSS/JS. Wails, Task and CI build the frontend automatically.

Playwright starts an isolated Go server with temporary config/SQLite for each test, without using personal data. See the [E2E strategy](e2e-testing.md) for the risk inventory, browser matrix, local/CI commands, and visual baseline review rules. For disk mode: `COMM_RELAY_E2E_DISK=1 npm run test:e2e`. Report: `playwright-report/index.html`.

## Main checks

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
go mod download
go build ./...
go test ./... -race
npx playwright install --with-deps chromium webkit
npm run test:e2e -- --project=chromium --project=webkit
```

Install and run the same Go linter used in CI:

```bash
go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.13.2
golangci-lint run ./...
```

## Development server with live reload

Install the tools and start the development stack:

```bash
task tools:install
task web:dev
```

`task web:dev` first builds the admin, then runs the Go server through Air and Vite with React Fast Refresh; the interface is available at `http://127.0.0.1:17878`. Development data is stored in `var/data/`. To copy the desktop installation data (`config.json`, the database, and `overlay-assets`) again, run:

```bash
task data:sync
```

## Headless server

For backend, admin, and overlay work you can run the server without the desktop shell:

```bash
go run ./cmd/comm-relay-server -web ./web
```

By default the server listens on `127.0.0.1:17877` and creates `config.json` in the working directory.

| Flag | Purpose |
|------|---------|
| `-web ./web` | Override embedded static assets with repository files |
| `-config path` | Use another `config.json` |
| `-addr 127.0.0.1:port` | Override the address from config |
| `-debug` | Enable verbose logs |

Build a headless binary:

| System | Build | Run |
|--------|-------|-----|
| Windows | `go build -o comm-relay.exe ./cmd/comm-relay-server` | `.\comm-relay.exe -web .\web` |
| Linux / macOS | `go build -o comm-relay ./cmd/comm-relay-server` | `./comm-relay -web ./web` |

## Desktop build (Wails)

Install the Wails CLI:

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@v2.16.0
```

Build from the repository root:

```bash
cd cmd/comm-relay-desktop
wails build
```

The resulting binary is placed in `cmd/comm-relay-desktop/build/bin/`.

### Windows

- Requires **Go 1.27.1+** and **WebView2** (normally already installed on Windows 11).
- Wails does not require an additional SDK.
- Check the environment with `wails doctor`.

### Linux

For Ubuntu, Debian, or Linux Mint desktop builds:

```bash
sudo apt update
sudo apt install build-essential pkg-config \
  libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev
```

If `libwebkit2gtk-4.1-dev` is unavailable, install the **WebKitGTK 4.1** equivalent from your distribution repository.

The **Browser** source and **Custom Browser Docks** are not available in every OBS package from standard repositories. To test the overlay and dock, use OBS from the [official PPA](https://obsproject.com/kb/linux-installation) or Flatpak from Flathub. OBS docks may be unavailable on Wayland; use an X11 session when needed.

### macOS

- Requires **Go 1.27.1+** and **Xcode Command Line Tools** (`xcode-select --install`).
- Build for the current machine with `wails build`.
- Build a universal binary as in CI with `wails build -platform darwin/universal`.
- Open an unsigned local build through **Open** in the Finder context menu or from the terminal.

## Main URLs

| URL | Purpose |
|-----|---------|
| `http://127.0.0.1:17877/` | Admin panel |
| `http://127.0.0.1:17877/dock/messages` | OBS message log |
| `http://127.0.0.1:17877/overlay` | OBS Browser Source: chat |
| `http://127.0.0.1:17877/overlay/leaderboard` | OBS Browser Source: leaderboard |
| `http://127.0.0.1:17877/overlay/alert` | OBS Browser Source: alerts and sound |
| `http://127.0.0.1:17877/health` | Health check |
| `ws://127.0.0.1:17877/ws` | Event WebSocket |

Repository architecture and rules are documented in [`AGENTS.md`](../AGENTS.md), product context in [`concept.md`](concept.md), and the next horizon in [`roadmap.md`](roadmap.md).

## Releases

The [`.github/workflows/release.yml`](../.github/workflows/release.yml) workflow validates the project and builds desktop archives for Windows, macOS, and Linux when a `v*.*.*` tag is published or the workflow is started manually.

Before a release, add user-facing changes to `## [Unreleased]` in [`CHANGELOG.md`](../CHANGELOG.md). On publish, the workflow:

1. checks that `[Unreleased]` contains entries;
2. promotes them into a dated version section;
3. creates an empty `[Unreleased]` section;
4. commits the updated changelog to `main`;
5. uses the version section as the GitHub Release notes.

Example:

```bash
git tag v0.6.0
git push origin v0.6.0
```

If the version section already exists, the workflow does not duplicate it.
