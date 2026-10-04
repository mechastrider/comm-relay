## Context

Live contract labels live in shared RU/EN catalogs. `MessagesProvider` plays only message notification tones. The global runtime already distributes WebSocket events. `web/alert/alert-sound.js` and `alert-scheduler.js` implement media selection and bounded alert scheduling. The leaderboard root currently uses `justify-content: flex-end`. The admin is React/TypeScript despite stale vanilla-only context in OpenSpec config.

## Goals

Deliver all three operator improvements with existing event/config contracts and clear default/disable behavior.

## Non-Goals

Speech synthesis, native playback, audio-device selection, dock audio, cross-client sample-accurate synchronization, domain/API identifier migrations, and publishing.

## Component / Process / IPC Boundaries

Go config owns the new preference. The global React admin owns a command audio monitor using the existing runtime subscription. Reuse static alert media/scheduler helpers where appropriate. No new IPC, server event, or background process.

## State and Event Flow

After config loads, the monitor consumes live alert events. Use the existing bounded scheduler, including silent non-command slots, so commands follow the same priority and duration policy as the overlay. Only command sources (including legacy source-less command alerts) are audible. Preserve custom file priority and event volume. Local queues are independent, so clients opened at different times are not guaranteed synchronized.

## Threading / Async / Cancellation

Keep one monitor per mounted admin root. A generation/disposal guard prevents late audio promises starting after disable or unmount. Clear pending events, timers, media, and contexts on disable/unmount. Resume audio from pointer or keyboard interaction; discard blocked/stale events rather than replaying them later. Navigation does not remount the monitor.

## Security and Trust Boundaries

Accept only existing safe stored sound filenames and same-origin asset URLs. Render error/help text with React text nodes. No extra network origins, secret storage, or native privileges.

## Decisions

- Use “Viewer rewards” / “Зрительские награды” to distinguish the live workflow from the Audience award catalog; retain internal `contracts` keys and routes for compatibility.
- Store a separate `admin.command_sound_enabled` boolean. Seed defaults before disk decoding; preserve omission in update merges. Explicit false is never defaulted back to true.
- Use a global admin consumer, not a Live-only component, to survive workspace navigation.
- Reuse the alert queue policy rather than overlap recordings. Keep non-command alerts silent locally.
- Change ranking alignment at its root and inspect theme overrides; preserve existing fitting geometry and chrome.

## Risks / Trade-offs

Autoplay may require one interaction in browsers/WebView; provide a recoverable status/action. App and OBS audio can both enter desktop capture; settings help must explain the independent switch. Multiple browser admin instances can each play audio; cross-tab ownership is outside this bounded change. A client joining late can differ from OBS timing.

## Migration / Rollout / Rollback

Additive config field; existing configs enable monitoring and saved false survives reload. No SQLite migration. Older binaries ignore the field. Standard frontend build and Go packaging apply; no release is authorized.

## Open Questions

None blocking. “Speech” is interpreted as existing recorded command audio, not a request for a new TTS engine.
