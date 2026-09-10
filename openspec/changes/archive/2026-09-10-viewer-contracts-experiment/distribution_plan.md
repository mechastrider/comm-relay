# Distribution Plan

## Artifact Matrix

| OS/architecture | Package/artifact | Signing/notary | Smoke target |
|-----------------|------------------|----------------|--------------|
| Windows 11 / amd64 | `CommRelay-vX.Y.Z-windows-amd64.zip` with Wails desktop executable and embedded web/migration assets | Existing unsigned early-release policy | Upgrade an existing data directory, operate contracts in WebView2/dock, and render alert plus persistent leaderboard card in OBS |
| macOS / universal amd64+arm64 | `CommRelay-vX.Y.Z-macos-universal.zip` with `.app` bundle | Existing unsigned/unnotarized policy | Migration/startup plus browser/webview contract flow and transparent alert smoke |
| Linux / amd64 | `CommRelay-vX.Y.Z-linux-amd64.tar.gz` with current desktop-entry assets | Existing unsigned policy | Migration/startup under WebKitGTK, contract flow, transparent alert; preserve documented OBS GPU workaround |
| Headless development build / supported Go host | `comm-relay-server` | Not signed | HTTP lifecycle, SQLite restart, `/ws` announcement, and static admin/alert behavior |

No filename, archive layout, installer, icon, desktop entry, runtime dependency, or package-content category changes. The existing web embedding and `migrations/*.sql` embedding must include the new files in every desktop and headless build.

## Build Reproducibility and Provenance

Use the pinned Go version from `go.mod` (Go 1.26.3+) and committed module sums. Static web assets have no production bundling step, but their source revision must match the binary that embeds them. Release workflow artifacts continue to be built from the tagged commit using the current Wails matrix and naming rules. Before packaging, run `npm ci` from the lockfile, web lint/tests, Go tests (including race coverage for the lifecycle), golangci-lint v2.12.2, and all target builds. Record the commit/tag and toolchain versions through the existing workflow; no generated dependency or vendored runtime is added.

## Install / Upgrade / Downgrade / Uninstall

Portable extraction and first launch remain unchanged. On first run of the new binary, Goose applies migration 15 to the existing viewer database before the admin/server becomes available. Fresh installs create the complete schema directly through the same ordered migrations. The feature requires no opt-in config and initially shows no active contract.

An older binary may be launched against the additive schema only after the planned compatibility test passes; it ignores `viewer_contracts` and writes interaction events with null `contract_id`. It cannot view or settle an active contract. Operators who intentionally downgrade the schema must first back up data, ensure no result still needs settlement, and accept removal of contract rows/provenance. Uninstall continues to use the existing archive/app removal and optional user-data cleanup instructions.

## Update Channels and Compatibility

CommRelay has no new auto-update channel or protocol. The change is delivered by the existing GitHub release workflow. New API routes, the `source: "contract"` alert variant, and `viewer_contract_state` frame are additive. Older chat, dock, leaderboard, and alert clients ignore unknown fields/frames and continue processing known frames; the new server does not alter existing config. Twitch, YouTube Live, and VK connector versions/scopes are unchanged.

Because server, embedded admin UI, alert UI, and migration form one coherent feature, mixed loose-web/server versions are development-only. A new admin UI against an old server must show a recoverable unavailable-feature error; an old admin UI against a new server simply leaves contracts unused.

## Data Migration and Rollback

Release qualification must preserve a copy of a representative version-14 database, then verify 14→15, restart with an active contract, settlement, and unchanged existing reward history. Also verify fresh install and migration down/up on disposable copies. Migration failure is fail-closed and must retain the original database for backup-based recovery; do not auto-delete or recreate it.

Application rollback keeps the additive schema by default. Schema rollback is a separate, explicit backup-first operation that drops `interaction_events.contract_id` and `viewer_contracts`; it cannot preserve an unsettled active contract or contract provenance. No `config.json` rollback or asset conversion is needed.

## Release Notes and Support

Add a concise Russian `[Unreleased]` changelog bullet describing the visible outcome: an operator can announce one viewer task in Live, award the winner through an existing reward, or close without a result. Mention that contracts are manual and only one may be active; do not describe table/routes/module details. Update existing RU/EN product-usage documentation only if it enumerates Live tabs or interactive features; install steps and artifact names remain unchanged.

Support checks should ask whether the active objective is visible in the leaderboard source after refresh, which dock content/visibility icon is selected, whether `/overlay/alert` is connected, and whether Repeat announcement restores a missed splash. Existing diagnostics WebSocket-drop counters and redacted lifecycle logs are sufficient; no new support bundle data is required.

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release.

## Not applicable

No installer/MSI/DMG/package-manager change, signing/notary work, entitlement, system service, auto-update channel, release CDN, database server, cloud migration, connector permission, or minimum-OS increase is introduced.
