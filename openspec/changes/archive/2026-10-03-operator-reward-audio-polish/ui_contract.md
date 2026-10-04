# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| Live | Announce and award viewer rewards | Existing Contracts tab, renamed | None |
| Settings | Hear command clips locally | Existing sound settings area | WebView/browser autoplay policy |
| Leaderboard | Place ranking in OBS | Existing overlay URL and Studio preview | None |

## Menus / Tray / Commands / Shortcuts

No changes to native menus, tray, shortcuts, or chat command triggers.

## View / Flow: Command audio and viewer rewards

### Layout and Components

Use the existing settings card, checkbox, hint, and save flow. Label: “Воспроизводить звуки команд в приложении” / “Play command sounds in the app”. Explain that playback uses each command's audio and volume and works independently of OBS; disabling avoids duplicate sound when capturing desktop audio. Keep separate from message notification tone controls.

### Data / Forms / Actions

Bind the checkbox to `admin.command_sound_enabled`. Initial persisted value is true when missing. Save through the existing config update workflow, preserving unrelated fields. Rename reward tab, statuses, errors, grammatical gender, progression metrics, and corresponding English copy consistently; keep localization keys and API identities stable.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Do not play before config is available; existing save busy state |
| empty | No sounds until a live command arrives |
| error/retry | Recoverable playback status; later commands can still play |
| offline/degraded | Existing socket recovery, no history replay |
| permission denied | Visible audio-enable action after autoplay rejection |
| interrupted/recovered | Disable clears audio/queue; re-enable accepts new events |

## Accessibility / Keyboard / Focus

Associate checkbox and help text, retain focus on save failures, and provide keyboard activation for audio recovery. Use a polite status region for playback errors.

## Scaling / Theme / Localization / Reduced Motion

Check both locales and narrow admin widths. Leaderboard top anchoring applies to every theme in panel/chips, with existing padding and fitting; no new motion.

## Explicit Non-Goals

Native window redesign, dock playback, new audio device controls, or changing catalog award behavior.
