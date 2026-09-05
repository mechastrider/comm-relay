## Why

Commands and awards can already show a splash, a built-in tone, and the viewer avatar, but operators cannot attach their own image or sound, and templates only know `{name}` and `{points}`. Seed text like `Hi, {name}!` looks as if the viewer is greeting themselves. Stream-interface notes already decided a global streamer display name, `{viewer}` / `{streamer}` / `{message}`, and a local media library in the existing `overlay-assets` directory. Without that, contribution rewards and `!` commands stay generic.

## Users and Supported Platforms

Stream operators on Twitch, YouTube Live, and VK Live using admin Audience catalogs, Settings, and OBS `/overlay/alert`. Same localhost contract for headless server and Wails. No OS-specific picker beyond the existing web file input.

## What Changes

- Persist global `streamer_display_name` in `config.json` (Settings). No per-preset override.
- Resolve splash templates on the server: `{viewer}` (display name), `{name}` as alias of `{viewer}`, `{streamer}`, `{points}`, `{message}` (award quote or the matched `!` line; empty if none). Unknown placeholders stay unchanged.
- Catalog editors list variables, insert on click, and show a preview with sample data.
- Wire reserved `image_asset` and `sound_file`: upload into `overlay-assets`, store only a generated filename, serve via `/overlay/assets/{filename}`. Custom image replaces the avatar; missing image keeps avatar fallback. Built-in tones remain; a custom file is an alternative. Per-item volume 0–100, default 70.
- First-cut media limits: static PNG/JPEG/WebP up to 4 MiB; MP3/WAV up to 5 MiB and 1–15 s. No SVG, GIF, video, or arbitrary paths.
- Per-item alert `layout`: `card` (default), `banner`, or `fullscreen`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `config-store`: `streamer_display_name`.
- `chat-commands` / `operator-rewards`: media, volume, layout, create/update fields.
- `overlay-alerts`: custom image/sound, layout, volume.
- `websocket-feed`: optional media and layout on `alert` frames.
- `http-api`: interactive asset upload kinds on the existing overlay-assets store.
- `admin-and-dock`: Settings name, catalog editors, preview.

## Scope / Non-Goals

No Reward Library catalog, Credits, random meme pools, command arguments, GIF/video/SVG, preset override of streamer name, or a full media-browser workspace. XP/activity is a separate change (`xp-contribution-foundation`).

## Impact

SQLite adds `sound_volume` and `layout` on commands and award types; `image_asset` / `sound_file` become live. Config gains one string. Overlay assets directory may hold larger files and audio. Streamer-visible changelog required. Packaging unchanged; backups must include `overlay-assets` with the DB.
