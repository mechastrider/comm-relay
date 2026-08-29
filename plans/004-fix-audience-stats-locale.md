# Plan 004: Audience platforms, period unique viewers, locale discard

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the STOP conditions section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 3c06b5f..HEAD -- web/admin/js/viewers.js web/admin/js/live-helpers.js web/admin/js/live-helpers.test.js web/admin/js/audience-helpers.js web/admin/js/audience-helpers.test.js web/admin/js/settings-workspace.js web/admin/js/i18n-ui.js web/admin/js/studio.js web/admin/index.html internal/api/viewers_handler.go`
> If in-scope files changed since this plan was written, compare the
> Current state excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (can land after 001–003)
- **Category**: bug
- **Planned at**: commit `3c06b5f`, 2026-08-29

## Why this matters

Audience rows show “No identities” even when `last_seen.platform` is present.
Statistics unique-viewer count uses the full stored list, so after New stream
the session can look non-empty. Viewer detail is rendered into either the
desktop inspector or the mobile sheet, not both, so crossing 1024px shows an
empty pane. Changing Application language immediately applies the locale, but
Reset/discard only restores the `<select>` — the UI stays on the discarded
language.

## Current state

### Audience platforms

`web/admin/js/viewers.js` ~170:

```javascript
const platforms = formatPlatformSummary(viewer.identities, formatPlatformLabel);
const platformText = platforms || t("viewers.noIdentities");
```

List API (`internal/api/viewers_handler.go`) builds summaries **without**
identities (`viewerSummaryFromStore(viewer, false)`) but **does** include
`last_seen.platform`.

### Unique viewers

`web/admin/js/live-helpers.js` `summarizeLiveStatistics`:

```javascript
const uniqueViewers = viewers.length;
```

Period message/score totals already branch on `period`. Tests in
`live-helpers.test.js` currently assert `uniqueViewers === viewers.length` —
**update those tests**; do not keep the wrong assertion.

### Responsive detail

`web/admin/js/viewers.js` ~832: `matchMedia` change calls `openDetailShell()`
only. Inspector body and sheet body are different nodes (~229–243).

### Locale discard

`web/admin/js/i18n-ui.js` `bindLocaleSelect` calls `applyAdminLocale` on
change (also writes localStorage).

`settings-workspace.js` `applySectionBaselineToDOM` for `application` only
sets `dom.timeLocaleInput.value`. Reset/discard/nav-cancel use that path
without `applyAdminLocale`.

Dynamic Settings headings/Save/Reset use one-shot `t()` without `data-i18n`
(~694–706, ~733). Studio dirty status: `index.html` has
`data-i18n="studio.published"` while `studio.js` overwrites with dirty/published
text — `applyDomTranslations` can force “Published” while dirty.

OAuth labels at `index.html` ~516/521 lack `data-i18n` though keys
`conn.oauthClientId` / `conn.oauthClientSecret` exist.

Do not add `data-i18n` to Twitch/YouTube/VK brand tab labels.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| JS tests | same as existing `web/admin/js/*.test.js` in `package.json` | pass |
| JS lint | `npm run lint` | pass |
| Go tests | `go test ./internal/api ./internal/config` | pass (only if you touch Go — prefer not to) |

## Scope

**In scope**:
- `web/admin/js/viewers.js`
- `web/admin/js/live-helpers.js`
- `web/admin/js/live-helpers.test.js`
- `web/admin/js/audience-helpers.js` and `.test.js` if you add a
  `formatPlatformSummary` fallback helper
- `web/admin/js/settings-workspace.js`
- `web/admin/js/studio.js`
- `web/admin/index.html` (OAuth `data-i18n` only)
- `web/admin/js/i18n-ui.js` only if you need to export a helper already there

**Out of scope**:
- Changing list API to embed full identities (client fallback is enough)
- Platform brand-name translations
- CSS tokens (plan 001)
- Network panel (plan 002)

## Git workflow

- Logical commits, e.g.:
  - `fix(admin): show last_seen platform on Audience rows`
  - `fix(admin): count unique viewers in the selected period`
  - `fix(admin): re-render viewer detail across the 1024px breakpoint`
  - `fix(admin): restore baseline locale when discarding Settings`
- Do not push unless asked.
- CHANGELOG: add Russian `[Unreleased]` bullets only for streamer-visible
  behavior (Audience platforms, Statistics unique count, language reset).
  Skip implementation trivia. Follow `.agents/skills/changelog/SKILL.md`.

## Steps

### Step 1: Platform column fallback

Prefer `formatPlatformSummary(identities, …)`. If empty, format
`viewer.last_seen && viewer.last_seen.platform` with `formatPlatformLabel`.
Use `t("viewers.noIdentities")` only when both are empty.

**Verify**: `audience-helpers.test.js` or viewers helper test covers
identities-empty + last_seen.twitch → “Twitch” (or existing label helper output).

### Step 2: Period-scoped unique viewers

In `summarizeLiveStatistics`, count viewers with activity in `period`:

- `session` → `session_message_count > 0` (or equivalent session field already
  used for totals in the same function — **read the rest of the forEach** and
  match it)
- `day` → `day_message_count > 0`
- `all` → `message_count > 0`

If the field is missing, do not count the row as unique for that period.

Update `live-helpers.test.js` that currently equals `viewers.length`.

**Verify**: after New stream semantics (session counts 0), unique is 0 even if
the viewers array is non-empty.

### Step 3: Re-render detail on breakpoint change

When `selectedViewerId` is set and `wideLayoutQuery` fires, call the same
path that fills the visible surface (`openViewerDetail(selectedViewerId, …)`),
not only `openDetailShell()`.

**Verify**: code review — both `audienceInspectorBody` and `audienceSheetBody`
get a render after the surface swap.

### Step 4: Locale restore on discard/reset

After restoring application baseline (Reset, section discard, confirmed
nav-away that restores baseline), call `applyAdminLocale` with the baseline
select value (`en-GB` vs `ru-RU`).

Listen for `admin-locale-applied` in `settings-workspace.js` and refresh
section headings + Save/Reset labels (`t(...)` again), **or** set `data-i18n`
on those nodes using existing keys (`settings.saveSection`,
`settings.resetSection`, `settings.section.*`).

Studio: remove `data-i18n="studio.published"` from the dirty-status node (or
keep it only when clean). On `admin-locale-applied`, call
`renderStudioDirtyState()`.

HTML: add `data-i18n="conn.oauthClientId"` and `conn.oauthClientSecret` on the
OAuth labels.

**Verify**: change language, click Reset without Save → UI language and
localStorage match baseline. Dirty Studio status does not snap to “Published”
on locale apply.

## Test plan

- `live-helpers.test.js`: unique count vs period fields; empty session.
- `audience-helpers.test.js`: last_seen fallback.
- Locale: if there is no JS test harness for settings-workspace, skip
  automated locale test; manual RU↔EN on Application section.

## Done criteria

- [ ] Audience platform column uses `last_seen` when identities are absent
- [ ] Unique viewers follows the selected period
- [ ] Breakpoint change re-renders selected viewer detail
- [ ] Discard/Reset of Application reapplies baseline locale
- [ ] Studio dirty label survives locale apply
- [ ] `npm run lint` passes; JS tests pass
- [ ] CHANGELOG `[Unreleased]` only if streamer-visible (see Git workflow)
- [ ] `plans/README.md` row 004 set to DONE

## STOP conditions

- Viewer list JSON no longer has `last_seen.platform` — then a small API
  include is allowed, but do not invent identities on the client.
- Period unique count would require a new backend aggregate — stop and report;
  do not guess a field name that is not on the viewer row.
- `applyAdminLocale` on every keystroke of other application fields — only
  locale discard/reset/save paths.

## Maintenance notes

Reviewers: keep `viewers.noIdentities` for truly unknown viewers. Do not
treat `last_seen.platform` as a full identity graph.
