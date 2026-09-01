# Plan 002: Stop platform tabs from blanking Settings → Network

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the STOP conditions section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 3c06b5f..HEAD -- web/admin/js/connections.js web/admin/js/settings-workspace.js web/admin/index.html web/admin/app.js`
> If in-scope files changed since this plan was written, compare the
> Current state excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: 001 (same Settings surface; can land in one PR)
- **Category**: bug
- **Planned at**: commit `3c06b5f`, 2026-08-29

## Why this matters

After the operator opens Settings → Platforms and clicks Twitch/YouTube/VK,
`setConnectionsSection` still treats `network` as a sibling tab and sets
`#connections-network-panel.hidden = true`. Settings → Network only unhides the
outer section wrapper; the inner panel stays `[hidden]` (`display: none
!important` in tokens.css). The Network form looks empty.

## Current state

`web/admin/js/connections.js`:

```javascript
export const CONNECTIONS_SECTIONS = ['twitch', 'youtube', 'vk', 'network'];

export function setConnectionsSection(section, options) {
  CONNECTIONS_SECTIONS.forEach(function (id) {
    // sets panel.hidden = !selected for EVERY section including network
  });
}
```

`web/admin/js/settings-workspace.js`:
- `mountPlatformsSection` moves twitch/youtube/vk tabs+panels, then calls
  `setConnectionsSection("twitch")` (line ~775) — this hides the network panel.
- `mountNetworkSection` (line ~778) appends `#connections-network-panel` and
  sets `panel.hidden = false` once at mount. Later platform-tab clicks hide it
  again. `selectSettingsSection("network")` does not unhide the inner panel.
- `#connections-network-tab` stays behind in `#connections-dialog`
  (`web/admin/index.html` ~430). The dialog is then `hidden`.

`initConnectionsTabs` in `app.js` still binds all four sections.

Match existing POST-action / vanilla JS style. Keyboard tab cycling lives in
`connections.js` — keep platform-only cycling after the split.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Tests | `go test ./...` | pass (no Go change expected) |
| JS lint | `npm run lint` | pass |
| Grep network in platform list | `rg -n "CONNECTIONS_SECTIONS" web/admin/js/connections.js` | platform list no longer includes `network` for show/hide |

## Scope

**In scope**:
- `web/admin/js/connections.js`
- `web/admin/js/settings-workspace.js`
- `web/admin/index.html` only if the orphan Network tab in the connections
  dialog must be removed or `hidden`
- `web/admin/js/connections` tests if they exist; otherwise add a small
  node:test / existing JS test next to `connections.js` only if the repo
  already tests that module. Prefer exercising via settings-workspace if
  that is how other admin tests work.

**Out of scope**:
- Redesigning Settings IA
- Changing SOCKS/proxy fields
- Overlay CSS (plan 001)

## Git workflow

- Commit: `fix(admin): keep Settings Network panel visible after platform tabs`
- Do not push unless asked.

## Steps

### Step 1: Split platform vs network in connections.js

Introduce `PLATFORM_SECTIONS = ['twitch', 'youtube', 'vk']`.
`setConnectionsSection` must iterate **only** platform tabs/panels.
Keep `connectionsSectionForFieldKey` mapping `network_socks5_address` →
`network` for focus helpers, but focusing a network field must **not** hide
platform panels or require a platform tab to be selected.

Keyboard/click handlers that currently walk `CONNECTIONS_SECTIONS` must walk
platforms only once Network is owned by the Settings workspace.

**Verify**: reading `setConnectionsSection` shows it never sets
`#connections-network-panel.hidden`.

### Step 2: Re-show the network panel when that Settings section is selected

In `selectSettingsSection` (or `mountNetworkSection` plus a `show` path), when
`sectionId === "network"`, set `#connections-network-panel.hidden = false`.

When leaving network, do not rely on `setConnectionsSection` to hide it; hide
via the outer `[data-settings-section-panel]` as today.

After `mountPlatformsSection`, do **not** call `setConnectionsSection("twitch")`
if that call still touches network. If you still call it, Step 1 must have
made it platform-only.

**Verify**: mentally trace: Platforms tab click → `setConnectionsSection('youtube')`
→ Network section click → inner panel `hidden === false`.

### Step 3: Neutralize the orphan Network tab in the connections dialog

After mount, hide or remove `#connections-network-tab` (it is no longer in the
visible tablist). Do not leave it in the keyboard roving tabindex sequence.

**Verify**: `document.getElementById('connections-network-tab')` is either
absent from the dialog tablist or `hidden`.

## Test plan

- If `web/admin/js/*.test.js` pattern exists for connections, add:
  - `setConnectionsSection('twitch')` does not set network panel hidden
    when the network panel exists in the document.
- Manual: Settings → Platforms → YouTube → Settings → Network → SOCKS fields
  visible. Then Platforms again still shows Twitch/YouTube/VK panels.

## Done criteria

- [ ] Platform tab interaction cannot persist `hidden` on `#connections-network-panel`
- [ ] Settings → Network shows the proxy form after visiting Platforms
- [ ] `npm run lint` passes if JS changed
- [ ] `plans/README.md` row 002 set to DONE

## STOP conditions

- Connections dialog is still the live UI for Network (plan assumes workspace
  mount moved the panel). If Network is no longer `#connections-network-panel`,
  stop and re-trace.
- Tests fail because some other caller requires `setConnectionsSection('network')`
  to show the panel — restore a dedicated `showNetworkPanel()` instead of
  stuffing network back into the platform loop.

## Maintenance notes

Reviewers: `[hidden] { display: none !important }` in `tokens.css` makes a
stale `hidden` attribute look like “missing CSS on the section”, not a JS bug.
