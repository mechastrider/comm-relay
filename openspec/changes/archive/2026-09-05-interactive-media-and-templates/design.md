## Context

Commands and awards already persist unused `image_asset` and `sound_file` columns. Create/update ignore them. Overlay-assets next to `config.json` already stores panel images (512 KiB, SVG allowed) and serves `GET /overlay/assets/{filename}`. Splash templates only replace `{name}` and `{points}`. Alert frames tell clients to ignore custom media. Stream-interface notes locked a global streamer name, `{viewer}`/`{streamer}`/`{message}`, and first-cut media limits. `xp-contribution-foundation` is a separate change; this one must not wait on Credits or Reward Library.

`studio-overlay-test-tools` may make alert chrome fill the Browser Source. Item `layout` still chooses composition inside that rectangle (`card` compact, `banner` wide, `fullscreen` fill).

## Goals / Non-Goals

Goals:

- Operators can put a local image and/or sound on a command or award.
- Templates can address viewer, streamer, points, and a short message.
- Streamer name is one Settings field for the install.
- Overlay stays path-safe: generated filenames only, text nodes for copy, local HTTP for media.

Non-goals:

- Reward Library, Credits, random pools, command arguments, GIF/video/SVG alerts, preset-level streamer override, a standalone media-manager workspace, or XP/activity.

## Component / Process / IPC Boundaries

- Settings writes `streamer_display_name` through existing `POST /api/config/update`.
- Audience catalog editors upload via `POST /api/overlay/assets/upload` with `kind` `alert_image` or `alert_sound`, then save filenames on create/update.
- Ingest and award grant resolve templates on the server and attach filenames, `layout`, and `sound_volume` to the existing `alert` WebSocket frame.
- `/overlay/alert` loads images/sounds only from `/overlay/assets/{filename}`. It never follows remote URLs from catalog fields.
- No native file dialog; the web/Wails file input is enough.

## State and Event Flow

```text
Settings: streamer_display_name
  -> config.json
  -> template resolver

Editor: file picker
  -> POST overlay/assets/upload (kind)
  -> generated filename
  -> POST commands/update or awards/update
  -> SQLite image_asset / sound_file / sound_volume / layout

!gg or Reward
  -> resolve {viewer} {name} {streamer} {points} {message}
  -> alert frame + optional image_asset, sound_file, layout, sound_volume
  -> /overlay/alert: custom image else avatar; custom sound else built-in
```

`{message}` is the bounded award quote when present, else the matched command line (`!gg`), else empty.

## Threading / Async / Cancellation

Uploads are synchronous HTTP with size limits. Duration and image-dimension checks run in the request before write. Alert playback stays on the overlay page. Play/Stop in the admin editor is local to that page and MUST NOT broadcast an alert.

## Security and Trust Boundaries

Filenames must pass the existing overlay asset name rules. Reject path separators, `..`, and URLs in catalog fields. Detect type from bytes. Do not `innerHTML` templates. Serve assets as static files with the current name check. Overlay MUST NOT request operator filesystem paths. Delete refuses files still referenced by presets, commands, or awards.

## Decisions and Alternatives

1. **One `overlay-assets` directory, `kind` on the existing upload action.** A second tree would split backups. Panel vs alert kinds keep SVG/512 KiB panel rules from leaking into alerts.
2. **Global `streamer_display_name` only.** Notes already deferred preset override.
3. **`{name}` remains an alias of `{viewer}`.** Existing seeds keep working.
4. **Custom image replaces avatar; no dual portrait.** Simpler composition for OBS.
5. **Custom sound replaces the built-in tone, with shared volume.** Mixing two sounds is worse on stream.
6. **Layout is per catalog item, not a Studio-only preset.** Operators want `!gg` fullscreen and Joke as a card without another OBS source.
7. **Reference-safe cleanup for catalog uploads.** The editor tracks newly uploaded files until a successful catalog save. Clear, replacement, selection/navigation away, and item deletion request cleanup through the existing reference-aware delete endpoint; files shared by another preset or catalog item remain. A crash between upload and cleanup may still orphan a file, and no background GC is introduced.

## Risks / Trade-offs

- MP3 duration needs a small decoder (no ffmpeg). If duration cannot be read, reject the upload.
- Large 4–5 MiB files grow the config directory; backup copy must include `overlay-assets`.
- `studio-overlay-test-tools` full-rect chrome plus `card` layout must be checked together so compact cards do not stretch.
- Parallel apply with `xp-contribution-foundation` will touch the same catalog editors; merge filenames, volume, and layout onto whatever XP field rename already landed.

## Migration / Rollout / Rollback

Goose adds `sound_volume INTEGER NOT NULL DEFAULT 70` and `layout TEXT NOT NULL DEFAULT 'card'` on `commands` and `award_types`. Existing null media stays null. Config omits `streamer_display_name` → empty. Old overlay clients ignore new alert fields and keep avatar + built-in sound. Rollback: previous binary ignores extra columns and config key; leftover files remain on disk.

## Open Questions

None for this slice. Preset override of streamer name stays closed (not now). Extra formats (GIF, OGG, video) wait for a later Reward Library check.
