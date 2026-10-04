# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| Chat overlay | See viewer level and uses | Existing OBS source | None |
| Leaderboard | Recognize viewer level | Existing OBS source | None |
| Studio | Disable individual visuals | Chat / Leaderboard inspector | None |
| Audience | Inspect remaining uses; choose emblem | Viewer detail / Levels | None |

## Menus / Tray / Commands / Shortcuts

Not applicable: no native commands added.

## View / Flow: Viewer visuals

### Layout and Components

Name/platform/avatar live on the left of a wrapping header, with a single right-aligned group for the level badge and both magazines. Long names ellipsize; at insufficient width the status group wraps together. Message text spans the entire content width below. Award feedback appears below the body only when present; absent feedback takes no space. Use small local SVGs and CSS cartridges. Preserve message wrapping, queue anchoring, transparency and TTL. Leaderboard only receives badge; Audience receives badge and exact quota counts.

### Data / Forms / Actions

Native labeled checkboxes per preset, true by default; save/revert follows Studio. Level editor select offers shield, chevron_1, chevron_2, chevron_3, star, laurel. Preview the selected emblem beside it. Larger magazines always show remaining/total.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Preserve chat, omit unknown visuals; disable saving during existing busy state |
| empty | No invented viewers; spent stocks remain visible |
| error/retry | Clear unavailable status, retry bounded read |
| offline/degraded | Preserve message queue, no guessed ammunition |
| permission denied | Existing request error handling; no privileged fallback |
| interrupted/recovered | Fetch fresh state after restoration/reconnect |

## Accessibility / Keyboard / Focus

Localized control labels, accessible emblem titles and remaining/capacity descriptions. Native checkbox/select keyboard semantics. No new focusable on-stream decoration.

## Scaling / Theme / Localization / Reduced Motion

All five existing themes, normal/compact modes and narrow sources. Shape distinguishes ranks and fill distinguishes uses without color alone. EN/RU locale keys. No mandatory animation or persistent motion.

## Explicit Non-Goals

No new theme, dock controls, player-facing input, alert artwork or user image upload.
