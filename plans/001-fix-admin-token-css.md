# Plan 001: Map Settings/Studio CSS to real design tokens

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the STOP conditions section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 3c06b5f..HEAD -- web/admin/styles/settings.css web/admin/styles/studio.css web/admin/styles/tokens.css web/admin/styles/primitives.css web/admin/index.html`
> If in-scope files changed since this plan was written, compare the
> Current state excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `3c06b5f`, 2026-08-29

## Why this matters

`web/admin/styles/settings.css` and `studio.css` reference tokens that do not
exist (`--space-*`, `--font-size-*`, `--radius-md`, `--color-accent`,
`--color-surface-raised`). The browser drops those declarations. Settings
section tabs lose padding, gap, radius, and the active accent; Studio loses
column/toolbar gaps. This is the root cause of “tabs have no styles / spacing
is off”.

## Current state

- `web/admin/styles/primitives.css` defines `--primitive-space-1`…`8`,
  `--primitive-font-size-sm` / `lg`, `--primitive-radius-md`.
- `web/admin/styles/tokens.css` defines semantic colors and **legacy aliases**
  `--surface-raised`, `--amber`. There are **no** `--space-*` or `--font-size-*`
  aliases.
- Other admin CSS (`shell.css`, `components.css`, `dialogs.css`) already uses
  `--primitive-*` / `--amber`. Do not invent a second alias layer.
- HTML close buttons use `class="btn-icon"` (`web/admin/index.html` ~306 and
  ~1169) but CSS only styles `.icon-btn` (`components.css`, `forms.css`).

Token map (use this, nothing else):

```text
--space-N              → --primitive-space-N
--font-size-sm         → --primitive-font-size-sm
--font-size-lg         → --primitive-font-size-lg
--radius-md            → --primitive-radius-md
--color-surface-raised → --surface-raised
--color-accent         → --amber
--color-accent-subtle  → color-mix(in srgb, var(--amber) 18%, var(--surface-raised))
```

`--color-border-subtle`, `--color-text-primary`, `--color-text-muted`,
`--color-status-warning` are already defined — leave them.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Token leftover check | `rg -n -- '--space-|--font-size-|--radius-md|--color-accent|--color-surface-raised|--color-accent-subtle' web/admin/styles` | no matches in `settings.css` / `studio.css` |
| Class leftover check | `rg -n 'btn-icon' web/admin` | no matches |
| JS lint if HTML-only | skip npm lint | — |

## Scope

**In scope**:
- `web/admin/styles/settings.css`
- `web/admin/styles/studio.css`
- `web/admin/index.html` (rename `btn-icon` → `icon-btn` on two close buttons)

**Out of scope**:
- Adding `--space-*` aliases to `tokens.css`
- Overlay/dock CSS
- JS behavior (plans 002–004)
- CHANGELOG (visual restoration of already-shipped redesign, not a new product behavior)

## Git workflow

- Stay on the current feature branch.
- Commit message style: `fix(admin): use design tokens in Settings and Studio CSS`
- Do not push unless asked.

## Steps

### Step 1: Rewrite undefined tokens in settings.css

Replace every undefined `var(--space-N)`, `var(--font-size-*)`,
`var(--radius-md)`, `var(--color-surface-raised)`, `var(--color-accent)`,
`var(--color-accent-subtle)` using the map above.

Active tab rule should become:

```css
.settings-nav__link--active,
.settings-nav__link[aria-current="location"] {
  border-color: var(--amber);
  background: color-mix(in srgb, var(--amber) 18%, var(--surface-raised));
}
```

**Verify**: `rg -n -- '--space-|--font-size-|--radius-md|--color-accent|--color-surface-raised' web/admin/styles/settings.css` → no matches.

### Step 2: Rewrite undefined tokens in studio.css

Same mapping for `--space-2/3/4` and `--font-size-sm`. Leave `--color-text-muted`
and `--color-status-warning`.

**Verify**: `rg -n -- '--space-|--font-size-' web/admin/styles/studio.css` → no matches.

### Step 3: Align icon-button class names

In `web/admin/index.html` change:
- `#audience-inspector-close` `class="btn-icon audience-inspector__close"` → `class="icon-btn audience-inspector__close"`
- `#audience-sheet-close` `class="btn-icon audience-detail-sheet__close"` → `class="icon-btn audience-detail-sheet__close"`

Keep existing `data-i18n-aria-label` / `aria-label`.

**Verify**: `rg -n 'btn-icon' web/admin` → no matches.

## Test plan

- No new unit tests (pure CSS/class rename).
- Manual: admin `/` desktop and ~720px. Settings nav tabs have spacing and
  visible active state. Studio toolbar/columns have gaps. Audience close
  buttons match other icon buttons.

## Done criteria

- [ ] No undefined tokens remain in `settings.css` / `studio.css`
- [ ] No `btn-icon` in `web/admin`
- [ ] `tokens.css` / `primitives.css` unchanged
- [ ] `plans/README.md` row 001 set to DONE

## STOP conditions

- In-scope CSS already uses `--primitive-*` (plan is stale).
- A visual check shows tokens exist under different names than this map.

## Maintenance notes

Reviewers: confirm no new invented token names. Future Settings/Studio CSS
must copy `--primitive-*` from `shell.css` / `components.css`, not Tailwind-like
`--space-3`.
