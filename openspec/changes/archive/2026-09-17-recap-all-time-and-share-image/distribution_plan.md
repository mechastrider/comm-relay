# Distribution Plan

## Not applicable

No installer, package layout, signing, notarization, auto-update, or artifact-name change. Recap overlay and admin scripts remain ordinary embedded/static `web/` assets already shipped by the existing Go/Wails embed. Operators replace the application files as they do for any other patch.

Upgrade: new binary serves `show-all` and additive `stream_recap_state` fields; existing databases and configs load without migration. Downgrade: previous binary keeps session Show/Hide; it will not present all-time or Download image. No release upload is authorized by this change.

## Authority Boundary

This plan does not authorize signing, notarization, upload, or release.
