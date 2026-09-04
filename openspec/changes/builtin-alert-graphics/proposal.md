## Why

Command alerts become visually distinctive only after the operator uploads media, while awards without custom files still fall back to a viewer avatar or generic placeholder. CommRelay should provide an effective, theme-aware visual identity immediately, while preserving uploaded files as the operator's override.

## What Changes

- Render a built-in command signal emblem or award medal whenever an alert has no custom `image_asset`.
- Give the seeded commands and awards semantic vector symbols; use a deterministic trigger/id-based emblem for every operator-created catalog item.
- Keep custom uploaded images authoritative: setting `image_asset` replaces the built-in emblem, and clearing it restores the built-in visual.
- Adapt emblem colors, framing, scale, and restrained entry motion to every existing alert theme and layout, including reduced-motion mode.
- Show the same built-in/custom fallback in command and award catalog image previews and explain the fallback in localized editor copy.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `overlay-alerts`: Alerts gain built-in command and award graphics when no custom image is present.
- `admin-and-dock`: Catalog media previews show the effective built-in or custom alert graphic.

## Impact

The change affects the static alert renderer and styles under `web/alert`, shared/admin catalog preview code and EN/RU strings, JavaScript tests, canonical OpenSpec requirements after sync, and the streamer-facing changelog. It adds no database migration, configuration field, upload format, remote dependency, or breaking WebSocket/API field.
