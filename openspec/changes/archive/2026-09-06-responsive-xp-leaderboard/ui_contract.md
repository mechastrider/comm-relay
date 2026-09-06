# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---------|-----------|------------------|----------------------|
| Studio leaderboard inspector | Choose automatic sizing, title behavior, secondary metric, and cap | Admin `/` → Studio → Leaderboard | Same in browser and Wails WebView |
| Studio sample preview | Size the ranking before publishing | Existing preview iframe and preview dimension controls | CEF/WebView font rasterization may differ slightly |
| Production leaderboard | Read an XP-first ranking sized by its OBS rectangle | `/overlay/leaderboard` Browser Source | Same contract in OBS on supported desktop OSes |

## Menus / Tray / Commands / Shortcuts

No native menu, tray, global shortcut, or command-line option changes. Existing Studio keyboard navigation and Publish flow remain.

## View / Flow: Configure leaderboard composition

### Layout and Components

Essentials replaces the leaderboard pixel-size field with a labelled Automatic/Fixed choice, a three-way title choice (From theme, Custom, Hidden), and a Show message count checkbox. Custom reveals one labelled title input. All settings retains the 12–48 px field when Fixed is selected and the 1–20 maximum-ranks field labelled as an upper limit rather than an exact row count.

### Data / Forms / Actions

Controls edit the existing in-memory preset draft. Switching surface, theme, or Essentials/All does not lose values. Publish persists `sizing_mode`, `font_size_px` when fixed, `title_mode`, `title` when custom, `show_message_count`, and `max_entries`. Reset-to-theme restores auto sizing, theme title, hidden message count, and the default cap without publishing immediately.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | Existing draft loading and Publish busy states remain; controls do not save independently |
| empty | Empty ranking keeps transparent page/chrome behavior; preview still has deterministic sample data |
| error/retry | Invalid custom title, font, or cap is shown beside the associated field and Publish focuses the first invalid control |
| offline/degraded | Preview may retain its last draft; failed Publish is reported and the baseline is not advanced |
| permission denied | Not applicable for localhost configuration |
| interrupted/recovered | Reload restores only the last published preset; unpublished draft rules remain unchanged |

## View / Flow: Resize the leaderboard

### Layout and Components

The title slot and list fill the source rectangle. Rank, avatar, name, and XP share one responsive row. Message count is a subordinate region that can disappear at compact dimensions. The list is bottom anchored as today unless a theme already specifies another intentional alignment.

### Data / Forms / Actions

Resize observation recalculates one scale and a complete-row count. The preview dimension controls and a real OBS viewport exercise the same rendering path. No resize value is persisted.

### States and Recovery

| State | Required behavior |
|-------|-------------------|
| loading/busy | The last safe layout remains until the next coalesced measurement |
| empty | No fictitious data appears outside sample preview |
| error/retry | An unavailable observer falls back to bounded fixed rendering without page scrollbars |
| offline/degraded | Responsive layout continues with the latest snapshot when the server is temporarily unavailable |
| permission denied | Not applicable |
| interrupted/recovered | Browser Source refresh recalculates from its current viewport before or when rows arrive |

## Accessibility / Keyboard / Focus

Every new control has a visible localized label. Conditional fields preserve logical focus order; hiding Custom or Fixed content moves focus to its owning choice when necessary. Errors use `aria-invalid`, `aria-describedby`, and the current alert pattern. The on-stream title is a real heading/text node; decorative avatars keep empty alt text because the visible name identifies the viewer.

## Scaling / Theme / Localization / Reduced Motion

All five themes and both panel/chips layouts implement the same semantic slots while retaining distinct chrome. Long Latin and Cyrillic titles wrap without covering rows. EN/RU labels stay in catalog parity. Row reorder or XP-change emphasis, if present, is brief and disabled under reduced motion; resize itself does not animate continuously.

## Explicit Non-Goals

No visibility policy, dock toolbar, command trigger, new theme, leaderboard period change, or chat/alert font redesign.

## Not applicable

Native windows, file dialogs, clipboard changes, notifications, platform permissions, tray/menu integration, and native IPC are unaffected.
