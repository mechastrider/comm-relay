# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| Settings | Set streamer display name | Admin `/` → Settings | Browser and Wails |
| Audience Commands / Awards | Edit splash, media, layout | Admin `/` → Audience | Editors not in the dock |
| Overlay alert | See custom splash | `/overlay/alert` | OBS Browser Source |

## Menus / Tray / Commands / Shortcuts

No native menu or global shortcut. Catalog Save/Delete and Settings save remain the persistence actions.

## View / Flow: Streamer display name

### Layout and Components

A single labeled text field in Settings (interface/general group), max 64 characters, helper text that it is used as `{streamer}` in command and award splashes. No per-preset control in Studio.

### Data / Forms / Actions

Saved with `POST /api/config/update` as `streamer_display_name`. Empty is valid.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Existing Settings save busy |
| empty | Field blank; preview uses a localized sample name |
| error/retry | Field error if over 64 code points |
| offline/degraded | Existing Settings cannot-reach |
| permission denied | Not applicable |
| interrupted/recovered | Existing dirty Settings handling |

## View / Flow: Catalog media and templates

### Layout and Components

Splash field plus a row of variable chips (`{viewer}`, `{name}`, `{streamer}`, `{points}`, `{message}`). Preview line under the field uses text only. Image: thumbnail or placeholder, Upload, Clear. Sound: existing built-in select, Custom file, Clear, volume 0–100, Play/Stop. Layout: three labeled choices (card, banner, fullscreen). Height-capped editor body scrolls; header Save/Delete stay pinned.

### Data / Forms / Actions

Upload uses multipart `kind` `alert_image` or `alert_sound`. Save sends filenames, `sound_volume`, `layout`, and template. Clear sends empty media fields. Play previews the selected built-in or the last uploaded custom file locally; it MUST NOT fire `/overlay/alert`.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Disable duplicate upload/save; keep editor values |
| empty | No image uses avatar fallback copy; no custom sound uses built-in/silence |
| error/retry | Show upload or field errors; keep last good filename |
| offline/degraded | Existing catalog error; do not claim media saved |
| permission denied | Not applicable; file input cancel leaves prior media |
| interrupted/recovered | Unsaved uploads that were not saved on the item may orphan a file until delete |

## View / Flow: On-stream layout

### Layout and Components

`card` compact splash; `banner` wide strip; `fullscreen` uses the source rectangle. Custom image is the portrait slot. Award vs command variants stay distinct. Page outside chrome stays transparent.

### Data / Forms / Actions

Layout comes from the alert frame. Missing layout is card.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Current non-preempting queue |
| empty | No chrome |
| error/retry | Broken image/sound falls back to placeholder / silence without blocking the queue |
| offline/degraded | Existing reconnect; no replay |
| permission denied | Autoplay failure is visual-only |
| interrupted/recovered | Reload starts empty |

## Accessibility / Keyboard / Focus

- Variable chips are buttons with accessible names.
- File inputs and Clear/Play have labels.
- Layout is a radiogroup or equivalent, not color-only.
- Preview and splash text remain text nodes.
- Volume has a named range control.

## Scaling / Theme / Localization / Reduced Motion

EN/RU catalogs for streamer field, variables, layout, and upload errors. Long templates wrap in the editor and overlay. All current overlay themes support the three layouts. Reduced motion keeps static emphasis; custom media still shows. Browser zoom must not clip editor actions.

## Explicit Non-Goals

No media library page, drag-and-drop DAM, GIF/video, preset streamer override, or dock catalog editors.

## Not applicable

Native file dialogs, tray, OS notifications.
