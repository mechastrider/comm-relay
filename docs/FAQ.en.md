# FAQ — CommRelay

Frequently asked questions about installation, the OBS overlay, and troubleshooting.

See also [`README.en.md`](../README.en.md) (installation, platform setup) and [`CHANGELOG.md`](../CHANGELOG.md).

**Language / Язык:** [English](FAQ.en.md) · [Русский](FAQ.md)

## Support

**Where to ask questions or report bugs:** write in the [Telegram support chat](https://t.me/mechastrider_apps/2) — it is the fastest channel. You can also write about an **OBS message theme** for your stream there. Source and issues are on [GitHub](https://github.com/mechastrider/comm-relay). In the CommRelay admin panel, links and the app version are in **Settings → About**.

## OBS overlay

### Black square instead of chat in OBS (Linux)

**Symptoms:** CommRelay is running, the connector is `connected`, messages appear in the admin panel, the overlay URL was copied from **Studio**, but the **Browser** source shows a solid black rectangle with no text.

**Fix (confirmed on Linux Mint):** disable Browser Source hardware acceleration in OBS.

1. **File** → **Settings**.
2. Open **Advanced** on the left.
3. Scroll to **Sources**.
4. Uncheck **Enable Browser Source Hardware Acceleration**.
5. Click **Apply** / **OK** and **fully restart OBS**.
6. In Browser Source properties, click **Refresh cache of current page**.

**Why it helps:** Browser Source in OBS uses embedded Chromium (CEF). On Linux, hardware acceleration for browser sources appeared in OBS Studio **31.1** and can conflict with the GPU driver, Wayland/X11, or a specific OBS build (apt, Flatpak, PPA). A CommRelay overlay with a transparent background often looks like a black rectangle even though the page loads.

**Notes:**

- On **NVIDIA** GPUs OBS sometimes **disables** browser hardware acceleration itself due to driver incompatibility; the OBS log may contain `[obs-browser]: Blacklisted driver detected, disabling browser source hardware acceleration.` — this is expected.
- If the checkbox is already off and the square remains, try **enabling** it, restarting OBS, and checking again (on some systems the opposite helps).
- For CommRelay overlay, **software** CEF rendering is usually enough; disabling HW accel is rarely noticeable on simple text chat.

**OBS links:**

- [Browser Source (KB)](https://obsproject.com/kb/browser-source)
- [Installing OBS on Linux](https://obsproject.com/kb/linux-installation)

### How to tell whether the problem is CommRelay or OBS

Before configuring OBS, open the overlay in a **regular browser** (not OBS):

```
http://127.0.0.1:17877/overlay
```

| What you see in the browser | Where to look |
|----------------------------|---------------|
| Messages arrive when new chat messages appear | CommRelay is fine; configure OBS (URL, cache, HW accel, source size) |
| Empty even though the admin panel has messages | CommRelay: overlay TTL, theme, WebSocket; see section below |
| Page does not open | CommRelay is not running or a different port is set in `config.json` |

Quick renderer check without live chat:

```
http://127.0.0.1:17877/overlay?preview=sample&preview_background=checker
```

In the admin preview (**Studio**) you can switch the backdrop: white, checkerboard, game footage, or black, to check contrast on bright and dark scenes. The legacy query `preview_background=busy` is treated as game footage.

To pin a look to an OBS scene, copy the **Pinned preset** URL from **Studio**:

```
http://127.0.0.1:17877/overlay?preset=default
```

The overlay page background stays transparent: only the message card may be opaque.

You should see sample messages. The same mode exists in **Studio → Preview**.

### Messages in admin but not in overlay (browser and OBS)

1. **Message TTL** — in **Studio** set **0**, click **Publish**. By default messages disappear after 20 seconds; old entries are not shown when opening the overlay.
2. **Text only theme** — light text on a transparent background is almost invisible in a normal browser. For testing choose **Default** or open `?preview_background=dark` (dark scene) or `?preview_background=white` (bright scene).
3. **WebSocket** — at the bottom of the admin panel the **WS:** counter should be **2 or more** with `/overlay` open. In DevTools (F12) on the overlay tab check `ws://127.0.0.1:17877/ws`.
4. **OBS cache** — after changing overlay settings: right-click the source → **Refresh cache of current page**.
5. **URL and port** — copy the URL from **Studio**; if you changed the port in settings, update the Browser Source.

### OBS on Linux: Browser Source missing or empty (Flatpak)

Not every OBS build from distribution repositories includes a full Browser Source. For overlay and dock, prefer OBS from the [official PPA](https://obsproject.com/kb/linux-installation) (`ppa:obsproject/obs-studio`) or a trusted Flathub build.

**Flatpak** OBS sometimes restricts access to `127.0.0.1`; if the overlay opens in the system browser but not in OBS, check Flatpak network permissions or use a native package.

## YouTube

### Is Google OAuth required for chat

No, if public live chat is enough. By default CommRelay uses **Simple (video URL)**: set the channel handle (`@name`) or stream URL in **Settings → Platforms** — no Google Cloud or account sign-in required.

### Why Connect opens the system browser

In **API (OAuth)** mode, Google sign-in runs in your regular browser (Chrome, Firefox, etc.), not inside the CommRelay window. This is safer: you see the `accounts.google.com` address bar and do not enter your password inside the app. After a successful sign-in you can close the browser tab and return to CommRelay.

## Application (Linux)

### Are GTK/WebKit system libraries required

Yes, for the **desktop build** from [Releases](https://github.com/mechastrider/comm-relay/releases):

```bash
sudo apt install libgtk-3-0 libwebkit2gtk-4.1-0
```

If the app **already opens** and the admin panel works, these libraries are installed. Missing libraries usually prevent the binary from starting at all rather than breaking only the overlay.

### Where config.json is stored

`~/.config/comm-relay/config.json` — see the table in [`README.en.md`](../README.en.md).

## YouTube (OAuth)

### Why Google sign-in opens in the browser, not the CommRelay window

**This is intentional.** In **API (OAuth)** mode CommRelay opens the Google sign-in page in the **system browser** (Chrome, Firefox, etc.) where the address bar and password managers work as usual. The desktop window is no longer redirected to `accounts.google.com`.

**What to do:**

1. In **Connections** choose **Connection mode → API (OAuth)**.
2. Save **OAuth client ID** and **client secret**, click **Save**.
3. Click **Connect** — the browser opens.
4. After a successful sign-in close the tab with “YouTube connected” and return to CommRelay.

If the browser did not open, copy the link from the admin banner or check that `xdg-open` (or equivalent) is available.

**Without OAuth:** for most streams **Simple (video URL)** mode is enough — set the channel `@handle` without Google Cloud.
