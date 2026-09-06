# CommRelay

**Language / Язык:** [English](README.en.md) · [Русский](README.md)

[![CI](https://github.com/mechastrider/comm-relay/actions/workflows/ci.yml/badge.svg)](https://github.com/mechastrider/comm-relay/actions/workflows/ci.yml) [![Release](https://img.shields.io/github/v/release/mechastrider/comm-relay?label=release)](https://github.com/mechastrider/comm-relay/releases) ![Go](https://img.shields.io/github/go-mod/go-version/mechastrider/comm-relay) [![License](https://img.shields.io/github/license/mechastrider/comm-relay)](LICENSE) ![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20macOS%20%7C%20Linux-blue) ![OBS](https://img.shields.io/badge/OBS-Browser%20Source-9146FF?logo=obsstudio&logoColor=white) [![Wails](https://img.shields.io/badge/desktop-Wails%20v2-DF2C2C)](https://wails.io/) [![DonationAlerts](https://img.shields.io/badge/DonationAlerts-Поддержать-FD6535)](https://www.donationalerts.com/r/mechastrider)

CommRelay is a local interactive system for livestreams. It brings Twitch, YouTube Live, and VK Live chat together, tracks viewer contribution, and sends chat, leaderboards, commands, and rewards to OBS — without a cloud relay server.

Before **v0.5**, CommRelay was primarily a multichat app. Starting with v0.5, it is being rebuilt into a system where messages become stream events: viewers gain progress, commands trigger alerts, and the streamer can recognize contributions with rewards.

> [!WARNING]
> The interactive system is experimental and under continuous development. Features, workflows, and the progression model may change significantly between releases. Check [`CHANGELOG.md`](CHANGELOG.md) and back up your user data before updating.

![CommRelay — interactive livestream system: Live, Audience, Studio, and OBS overlay](docs/images/poster.jpg)

## See it in action

The best way to evaluate CommRelay is to see it running on the author's streams:

- [Twitch — mechastrider](https://www.twitch.tv/mechastrider)
- [VK Live — mechastrider](https://live.vkvideo.ru/mechastrider)
- [YouTube — @mechastrider](https://www.youtube.com/@mechastrider/streams)

## Features

- Combines Twitch, YouTube Live Chat, and VK Live / VK Video in one local feed.
- Tracks viewer stats (XP, messages, session/day/all-time) in a local `comm-relay.db` file next to `config.json` — no separate database server.
- Recognizes chat commands and lets the streamer grant viewer rewards from Live or the OBS message dock.
- Sends transparent chat, leaderboard, and command/reward alert surfaces to OBS.
- Embeds a separate message log in the OBS interface: `http://127.0.0.1:17877/dock/messages`.
- Shows a transparent leaderboard Browser Source: `http://127.0.0.1:17877/overlay/leaderboard?period=session|day|all` (same theme as chat; without `preset` it follows the active preset).
- Shows command and reward alerts on a separate OBS Browser Source: `http://127.0.0.1:17877/overlay/alert` (sound plays in that source; enable **Control audio via OBS** for stream audio).
- Provides a local console with Live, Audience, Studio, and Settings workspaces: statuses, messages, viewers, command and award catalogs, overlay setup, and diagnostics.
- In **Settings → Data** you can hide `!command` lines in the chat overlay only — they remain visible in Live and the dock.
- Supports Twitch emotes, FrankerFaceZ, BetterTTV, 7TV, and safe image previews.
- Automatically reconnects connectors and stores settings locally in `config.json`.

## Download and install

Ready-made builds are published on the [GitHub Releases](https://github.com/mechastrider/comm-relay/releases) page. For normal use you do not need Go, Node, Docker, or a database.

Choose the archive for your system:

| System | Release file | How to run |
|--------|--------------|------------|
| Windows 11, 64-bit | `CommRelay-vX.Y.Z-windows-amd64.zip` | Extract the archive and run `CommRelay.exe`. |
| macOS, 64-bit | `CommRelay-vX.Y.Z-macos-universal.zip` | Extract the archive and open `CommRelay.app`. |
| Linux, 64-bit | `CommRelay-vX.Y.Z-linux-amd64.tar.gz` | Extract the archive, make the file executable, and run `./CommRelay`. On first launch the app adds an icon to the menu on its own (Linux Mint, Ubuntu, etc.). |

Windows and macOS may warn that the app is not signed. This is expected for an early release: on macOS use **Open** from the Finder context menu; on Windows confirm launch via **More info** → **Run anyway**.

### Linux dependencies

The Linux desktop build requires system GTK/WebKit libraries. For Ubuntu/Debian:

```bash
sudo apt update
sudo apt install libgtk-3-0 libwebkit2gtk-4.1-0
```

If your distribution does not have the `libwebkit2gtk-4.1-0` package, install the WebKitGTK 4.1 equivalent from your distribution's repository.

### Linux menu icon (Mint, Ubuntu, …)

On Linux the app icon is not embedded in the binary — the desktop environment reads a `.desktop` file. CommRelay installs an entry in `~/.local/share/applications/` and a PNG icon on first launch. If the icon does not appear right away, restart the panel or log out and back in.

Manually from the extracted archive:

```bash
chmod +x CommRelay install-desktop.sh
./install-desktop.sh
```

Do not move the `CommRelay` folder after installing the shortcut without running `./install-desktop.sh` again (or without launching the app again) — the path in `.desktop` must point to the current binary.

## First launch

1. Launch the app. The CommRelay window opens and the local server starts inside it.
2. Open **Settings → Platforms** and enable the platforms you need.
3. Click **Save** on that section after changing settings.
4. Open **Studio**: on first visit **Add to OBS** opens with Browser Source steps and copyable URLs; then customize the on-stream surfaces (chat, leaderboard, alerts).

By default CommRelay listens on `127.0.0.1:17877`. The admin panel is available at `http://127.0.0.1:17877/`, and the overlay at `http://127.0.0.1:17877/overlay`.

## OBS Browser Source

1. In CommRelay open **Studio**: on the left, the on-stream surface list (chat, leaderboard, alerts). **Add to OBS** opens Browser Source steps and all copyable URLs.
2. Select a surface and copy **Follow active preset** from the preview — or open **Add to OBS** and copy the URL for the source you need. In OBS add a **Browser** source (chat, leaderboard, alerts) or a Custom Browser Dock (message log).
3. The primary chat, leaderboard, and alert URLs **omit** `?preset=` — the source follows the active preset. For a scene-specific look, copy the **Pinned preset** URL in **Add to OBS** or from **Preview options** (⋯) on the preview. The leaderboard also includes `period` and, when needed, `layout` / `font_size_px`.
4. For **Alerts** (`/overlay/alert`) add a separate Browser Source on the scene. Banner sound plays in that source — enable **Control audio via OBS** on the source to hear it in the recording and stream.
5. Set the size for your scene layout. Do not add a background manually: on-stream sources are already transparent.
6. Keep CommRelay running during the stream.

If you changed the port in settings, update the URL in OBS.

## Message log in the OBS interface

CommRelay can show a separate chat feed directly in the OBS interface. This panel is for the streamer: it does not appear on the scene and is not visible to viewers.

1. In CommRelay open **Studio** → **Add to OBS**, choose **Message dock**, and click **Copy URL**.
2. In OBS open **View → Docks → Custom Browser Docks…** (**Вид → Док-панели → Пользовательские браузерные доки…**).
3. Enter a name, for example `CommRelay Messages`, and paste the copied URL.
4. Click **Apply**, then place the new panel in a convenient part of the OBS interface.

The panel shows messages only: on open it restores up to the last 100 entries, then receives new ones in real time. If you scrolled the log up, new messages do not reset the position; to restore auto-scroll, scroll the feed to the bottom. The **Delete** button removes an entry from local history, the admin panel, the dock, and the active overlay. The **Reward** button grants an award from the **Audience** catalog — same as in Live.

If the CommRelay port was changed, replace `17877` in the URL. The app must stay running during the stream. To show messages to viewers, continue using a separate **Browser** source with the `/overlay` URL.

## Overlay settings

Open **Studio** in the CommRelay control panel.

| Setting | What it does |
|---------|--------------|
| **Max messages** | How many recent messages the overlay keeps on screen. |
| **Message TTL** | How long a message stays on screen: chips **8 s**, **20 s**, or **Until replaced** (0 — do not remove by time). A custom value is in **Advanced**. |
| **Font size** | Text size in the overlay, from **12 to 48 px**. |
| **Spacing** | **Comfortable** — normal padding. **Compact** — denser when many lines are on screen. |
| **Theme** | **Default** — cards with a semi-transparent background. **Text only** — text only, no background. **Cockpit panel** — shared HUD panel. **Cockpit popups** — separate MW5 HUD pop-up messages. **G-Rebels Cockpit popups** — pop-up messages in a gold aviation HUD style. The same theme styles chat and the leaderboard. |
| **Presets** | A named look for a scene or game: theme, limit, TTL, density, text edge, platform marker, panel, plus leaderboard automatic/fixed sizing, title, layout (`panel` / `chips`), and rank cap. An older `config.json` without presets becomes the **Default** preset. |
| **Follow / Pinned URL** | On the selected surface — **Follow active preset** (no `?preset=`). A pinned URL with `?preset=` is in **Add to OBS** or **Preview options** (⋯). Existing sources that already include `preset` keep working. |
| **Preview** | The surface list on the left switches the preview (**Chat / Leaderboard / Alerts**); the leaderboard preview always shows a fictitious top-5. Preview backdrop (white, checkerboard, game footage, black) is in **Preview options** (⋯). |

### Leaderboard size and content

In **Automatic** mode, Browser Source width controls the shared scale of text, portraits, spacing, and chrome, while height controls how many complete ranking rows fit. For example, a `320×180` source produces a compact composition with a few ranks; `640×360` produces a larger composition and, when height permits, more rows. Partial rows and scrollbars are never shown. **Maximum ranks** remains an upper limit (default 5).

The title can be **From theme**, **Custom**, or **Hidden**. Custom copy keeps the selected theme's title treatment; hiding the title releases its space to rows. Each row makes labelled **XP** the primary metric. Message count is off by default and can be enabled as secondary content; it disappears first when the source becomes compact.

Use **Fixed** mode for compatibility or exact manual composition with a 12–48 px size. Existing URLs with a valid `font_size_px=` continue to select fixed sizing.

Browser Source viewport size and OBS scene transform are different. Dragging transform handles scales an already rendered image. To make the leaderboard recalculate text and row capacity, change **Width/Height** in Browser Source properties (or the Studio preview dimensions), then adjust the scene transform if needed.

After changing appearance in Studio:

1. Click **Publish**. Until the draft is published, the live overlay does not change.
2. If the source is pinned (`?preset=`), refresh the Browser Source in OBS: right-click the source → **Refresh cache of current page**. An unpinned source picks up the active preset over WebSocket; still refresh the cache if the look looks stuck.

Without reloading in OBS, the overlay continues with the old parameters.

**Tip:** to compare themes, wait for several chat messages — the difference is not visible on an empty screen.

For **Cockpit panel**, **Cockpit popups**, and **G-Rebels Cockpit popups** themes, panel size is set by the Browser Source size in OBS. Place the source over the desired scene area and the theme stretches to that rectangle.

**Chat should look like your stream, not a generic widget.** Need a message theme for your brand, game, or HUD style? I can make OBS styling for you. Write in [Telegram](https://t.me/mechastrider_apps/2).

## Interface language

In the control panel open **Settings → Application** and choose `Русский` or `English`. The admin panel and OBS dock use the selected language and a unified 24-hour `HH:MM:SS` format without AM/PM.

## Platform setup

All platform settings are in **Settings → Platforms**.

### Twitch

Enable Twitch and enter the channel name without `#`. OAuth is not required: CommRelay reads the public chat via Twitch IRC.

### YouTube Live

By default **Simple (video URL)** is used — no Google Cloud or OAuth:

1. Enter the **Channel handle** (`@name` or channel URL) — CommRelay finds the current live stream on its own.
2. Or paste the URL/ID of a specific live video (takes priority over auto-discovery).
3. Enable the YouTube connector and save settings.

For **API (OAuth)** (automatic chat reading for an authorized account) choose **Connection mode → API (OAuth)**:

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create an OAuth client and enable **YouTube Data API v3**.
3. Add redirect URI: `http://127.0.0.1:17877/oauth/youtube/callback`.
4. In CommRelay paste **OAuth client ID** and **client secret**, save settings.
5. Click **Connect** — the system browser opens for Google sign-in. After successful authorization return to CommRelay.
6. Enable the YouTube connector and save settings again.

In simple mode the public live chat is read by URL. In API mode messages appear when the authorized account has an active stream with live chat.

Simple mode uses the undocumented InnerTube API (like the YouTube web player). The format may change without notice; if you have problems try API mode.

### VK Live

OAuth is not required. Enter the channel slug or `live.vkvideo.ru` URL, then enable the VK connector and save settings.

## Where settings are stored

Settings, OAuth tokens, and local parameters are stored only on your computer.

| System | Path to `config.json` |
|--------|------------------------|
| Windows | `%AppData%\comm-relay\config.json` |
| macOS | `~/Library/Application Support/comm-relay/config.json` |
| Linux | `~/.config/comm-relay/config.json` |

Do not publish `config.json` if it contains an OAuth client secret or tokens.

## Updating

Download a new archive from [Releases](https://github.com/mechastrider/comm-relay/releases), close the old app, and replace the application files. User `config.json` is stored separately, so settings are preserved.

Before updating check [`CHANGELOG.md`](CHANGELOG.md): it lists new features, fixes, and possible manual steps.

More on typical overlay and OBS issues on Linux: [`docs/FAQ.en.md`](docs/FAQ.en.md).

## Common issues

- **I change font or theme — nothing changes**: in **Studio** click **Publish**, then refresh the Browser Source in OBS if needed. Font size is only from 12 to 48 px.
- **The leaderboard row count does not change when I resize it on the scene**: change Width/Height in Browser Source properties. Scene transforms scale the rendered image; they do not change the viewport used to fit rows.
- **Spacing and Theme look the same**: compare with active chat; Compact is more noticeable with 5+ messages; Text only is easier to see on a green or dark scene background; Cockpit themes are meant for output over the game frame.
- **OBS shows nothing**: check that CommRelay is running, the URL in the Browser Source matches the port, and the connector in the admin panel has status `connected`. On **Linux** if the Browser Source shows a black square, disable browser hardware acceleration in OBS (**File → Settings → Advanced → Sources**) — see [`docs/FAQ.en.md`](docs/FAQ.en.md).
- **Port 17877 is in use**: close another app on that port or launch CommRelay with a different address via `-addr 127.0.0.1:<port>`.
- **YouTube OAuth fails**: redirect URI in Google Cloud must exactly match the port from `config.json`. Click **Connect** in API mode — sign-in opens in the system browser, not the CommRelay embedded window.
- **No YouTube messages**: an active stream with live chat enabled is required; in simple mode check the video URL.
- **Simple mode does not connect**: YouTube may show consent/captcha — try API mode or update the stream URL.
- **macOS won't open the app**: early builds are not signed; use **Open** from the Finder context menu.
- **Linux won't launch the window**: install GTK/WebKit dependencies from the Linux section.

## Documentation and development

- [Technical documentation for developers](docs/development.en.md) — local development, checks, Wails builds, and the release workflow.
- [Product concept](docs/concept.md) and the [interactive-system roadmap](docs/roadmap.md).
- [FAQ](docs/FAQ.en.md) — common OBS, overlay, and platform issues.

## Support and questions

- **Questions, suggestions, and feedback** — [Telegram support chat](https://t.me/mechastrider_apps/2).
- **Source code and issues** — [GitHub](https://github.com/mechastrider/comm-relay).
- In the admin panel: **Settings → About** (version and support links).

### A message theme for your stream

Built-in themes are only a starting point. If you want chat **in the style of your channel**, game, or scene, I can make an **OBS message theme** for you: colors, fonts, HUD, popups. Write in [Telegram](https://t.me/mechastrider_apps/2) — we can discuss references and what should appear on stream.

## Support the author

CommRelay is a free open-source project. If the app helps your streams, you can support the author via [DonationAlerts](https://www.donationalerts.com/r/mechastrider):

[![DonationAlerts](https://img.shields.io/badge/DonationAlerts-Поддержать-FD6535)](https://www.donationalerts.com/r/mechastrider)

## License

The project is distributed under the [MIT License](LICENSE). Copyright (c) 2026 Igor Lazarev.
