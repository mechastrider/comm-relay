## Why

OBS overlay preview appearance is inconsistent across themes: platform icons in HUD themes fall under the avatar instead of sitting with the nickname, G-Rebels hides platform identity by default, and preview backgrounds mix a mistranslated "busy/loaded scene" with an incomplete contrast set (no white). Streamers cannot compare themes or judge readability against bright gameplay.

## What Changes

- Place the platform icon inside the message identity, immediately before the display name, in every theme when the platform marker is `icon` or `both`.
- Default G-Rebels Cockpit popups to `both` (author rail + platform icon), matching MW5 Cockpit popups. Cockpit panel stays `stripe`.
- Unify preview backgrounds to four options, same CSS on `body` for every theme: white, checkerboard, game footage (`scene`, replacing `busy`), black (`dark`).
- Accept legacy `preview_background=busy` as `scene`. Preview still only paints transparent regions; HUD glass may cover the footage.
- Rename admin labels: "Загруженная сцена" / "Busy scene" → "Игровой кадр" / "Game footage"; "Тёмный" / "Dark" → "Чёрный" / "Black".

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `obs-overlay`: platform icon placement; G-Rebels default marker; preview background query values
- `admin-and-dock`: appearance preview background control and labels

## Impact

- Overlay DOM/CSS (`web/overlay`), admin preview select (`web/admin`), i18n catalogs, overlay-settings defaults (JS + Go `defaultOverlayStyleForTheme`)
- Query param `preview_background`; localStorage preview preference maps `busy` → `scene`
- FAQ overlay test URLs; CHANGELOG `[Unreleased]`
- Existing G-Rebels presets that already saved `stripe` keep that value until the operator resets the marker group to the theme default
