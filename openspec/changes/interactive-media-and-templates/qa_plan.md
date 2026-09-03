# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Windows 10/11 + OBS | x86-64 | All overlay themes; 100%/150%; keyboard editor | P0 |
| Chromium admin | Host | EN/RU; zoom 100%/125% | P0 |
| Linux/macOS browser | Existing | Default theme | P1 |

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| `config-store`: streamer name | Save `Jake`, fire `Hi {streamer}` | Alert text has Jake | P0 |
| `{name}` alias | Template `{name}` and `{viewer}` | Both become viewer display name | P0 |
| `{message}` award | Grant with quote | Quote in resolved text | P0 |
| `{message}` command | `!gg` | Resolved `{message}` is the `!gg` line | P0 |
| Empty streamer | Unset name, `{streamer}` in template | Empty substitution, not leftover braces if empty string; unknown tokens still left | P0 |
| Alert image | Upload PNG, save on `gg`, fire | Custom image, no avatar | P0 |
| Missing image | Clear image | Avatar fallback | P0 |
| Alert sound | Upload 3 s MP3, volume 70, fire | Custom file, no built-in | P0 |
| Built-in + volume | No file, chime, volume 40 | Built-in at 40% | P0 |
| GIF rejected | `kind` alert_image GIF | 400, no store | P0 |
| Path rejected | `image_asset` `C:\\a.png` | 400 | P0 |
| Layout banner/fullscreen | Set layout, fire, OBS sizes | Composition matches; page transparent | P0 |
| In-use delete | Delete filename used by `gg` | 400, file remains | P0 |
| Editor chips/preview | Insert `{viewer}`, preview | Preview shows Alice / current streamer | P0 |
| Play in editor | Play custom file | Hear locally; overlay does not splash | P0 |
| Panel upload unchanged | Studio panel PNG/SVG under 512 KiB | Still works | P0 |
| Long RU template | Cyrillic + `{streamer}` | Wraps; text nodes only | P1 |
| Reduced motion | Award + custom image | Static emphasis; image still shown | P1 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- Confirm files land only under `overlay-assets`.
- Restart: saved filenames still resolve.
- Cancel file picker: previous media kept.

## Persistence Migration / Corruption / Recovery

- Pre-migration DB: volume 70, layout card, null media.
- Missing file at overlay time: placeholder/silence, queue continues.
- Overlong streamer name rejected.

## Install / Upgrade / Downgrade / Packaged-App Smoke

- Upgrade, upload one image and one sound, reload OBS alert.
- Backup folder includes assets.
- Skip old-binary-on-new-DB except documented mismatch.

## Automated Commands / Manual Setup / Fixtures

```bash
npm ci
npm test
npm run test:i18n
npm run lint
go test ./...
go test -race ./internal/api/... ./internal/overlayassets/... ./internal/command/...
golangci-lint run ./...
go build ./...
openspec validate interactive-media-and-templates --strict
git diff --check
```

Fixtures: tiny PNG/JPEG/WebP, GIF, oversize, 3 s WAV/MP3, 20 s WAV, HEIC if available. Manual: Windows OBS alert + admin Play.

## Evidence and Explicit Skips

Record command output and a short OBS capture of card/banner/fullscreen. Skip signing, GIF-as-supported, video, preset streamer override, Linux OBS if unavailable (P1).
