# Plan 003: Preserve Studio draft and merge hot preset id

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the STOP conditions section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 3c06b5f..HEAD -- web/admin/js/studio.js web/admin/js/config-apply-restore.js web/admin/js/config-apply-restore.test.js web/admin/js/settings.js`
> If in-scope files changed since this plan was written, compare the
> Current state excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `3c06b5f`, 2026-08-29

## Why this matters

Two Studio state bugs:

1. Canceling dirty navigation still wipes unpublished appearance edits.
2. Hot-activating a preset while Studio is dirty restores the previous
   `active_preset_id` into the draft, so the inspector/preview lag the Live
   overlay even if Publish later prefers the server id.

Spec: `openspec/specs/admin-and-dock/spec.md` dirty-draft and hot-action
scenarios.

## Current state

### Cancel still re-enters Studio and resets the draft

`web/admin/js/studio.js` hashchange:

```javascript
if (suppressNavigationGuard) {
  suppressNavigationGuard = false;
  lastWorkspace = parseWorkspaceHash(window.location.hash);
  handleWorkspaceChange(); // → onStudioEnter → resetStudioDraftFromConfig
  return;
}
```

Cancel path: set hash back to `#studio` with `suppressNavigationGuard = true`,
then `return` without resetting. The **follow-up** `hashchange` hits the
suppress branch and still calls `handleWorkspaceChange()`.

`onStudioEnter()` always:

```javascript
mountStudioPanels();
resetStudioDraftFromConfig();
```

### Dirty apply copies the old draft wholesale

`web/admin/js/config-apply-restore.js` `resolveStudioDraftAfterConfigApply`:

```javascript
if (isDirty && draft) {
  const nextDraft = cloneOverlayAppearanceDraft(draft);
  // serverOverlay.active_preset_id is ignored
  return { shouldResetFromServer: false, overlayToApply: nextDraft, ... };
}
```

Do **not** “fix” this by making Publish send the stale draft id as the only
change. Merge the server `active_preset_id` into draft **and** baseline.

Existing tests: `web/admin/js/config-apply-restore.test.js`. There are **no**
tests for the navigation guard.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| JS tests | `npm test` or the command used by other `web/admin/js/*.test.js` files (check `package.json`) | pass including new cases |
| JS lint | `npm run lint` | pass |

## Suggested executor toolkit

- `web-static-frontend` for vanilla JS style
- `golang-tests` is **not** needed unless you touch Go (you should not)

## Scope

**In scope**:
- `web/admin/js/studio.js`
- `web/admin/js/config-apply-restore.js`
- `web/admin/js/config-apply-restore.test.js`
- New test file next to `studio.js` only if the repo already has a pattern for
  testing navigation; otherwise extend `config-apply-restore.test.js` for the
  preset merge and add a focused test for the suppress-hashchange branch if
  you can extract the guard into a testable function without a large refactor.

**Out of scope**:
- Changing Publish overlay payload merge in `settings.js` unless tests prove
  `active_preset_id` is still lost after the draft merge
- Overlay theme CSS
- Settings locale (plan 004)

## Git workflow

- Commit 1: `fix(admin): keep Studio draft when navigation is cancelled`
- Commit 2: `fix(admin): merge hot preset id into dirty Studio draft`
- Or one commit if you prefer: `fix(admin): preserve Studio draft across cancel and hot preset`
- Do not push unless asked.

## Steps

### Step 1: Do not reinitialize Studio on cancelled navigation

When `suppressNavigationGuard` fires because hash was restored to `#studio`
after Cancel:

- Update `lastWorkspace` to `"studio"`.
- **Do not** call `handleWorkspaceChange()` / `onStudioEnter()`.
- Keep the in-memory draft and DOM.

When suppress fires because the user **confirmed** discard and is leaving
Studio, `handleWorkspaceChange()` should still run (leave path).

Implement with an explicit flag or by comparing intended workspace, e.g.
`skipStudioReenter` set only on the cancel restore. Do not skip all suppressed
hashchanges — the confirm-leave path uses the same flag today.

**Verify**: code path for Cancel never calls `resetStudioDraftFromConfig()`.

### Step 2: Merge server active_preset_id into a dirty draft

In `resolveStudioDraftAfterConfigApply`, when `isDirty && draft`:

- Clone draft and baseline as today.
- If `serverOverlay.active_preset_id` is a non-empty string and differs from
  `nextDraft.active_preset_id`, copy it onto **both** `nextDraft` and
  `nextBaseline` (hot action is already published).
- Do not copy other server overlay fields (that would wipe unpublished
  appearance edits).

**Verify**: existing dirty-preserve tests still pass; new test:
dirty draft `active_preset_id: "a"` + server `"b"` → both draft and baseline
`"b"`, other draft fields unchanged.

## Test plan

- `config-apply-restore.test.js`: dirty + activated preset id merge; dirty
  without server id change still preserves appearance fields.
- Navigation: if extracting `shouldReenterStudioAfterSuppressedHash(prev, next,
  cancelled)` (or similar) is a 10-line pure function, unit-test it. Do not
  build a jsdom app bootstrap for this plan.

## Done criteria

- [ ] Canceling leave-Studio confirm keeps unpublished appearance fields
- [ ] Dirty Studio + hot preset updates draft `active_preset_id` without
      resetting appearance
- [ ] `npm run lint` and JS tests pass
- [ ] `plans/README.md` row 003 set to DONE

## STOP conditions

- `resolveStudioDraftAfterConfigApply` already merges `active_preset_id`.
- Navigation no longer uses `suppressNavigationGuard` (re-read `studio.js`).
- Fixing this seems to require rewriting workspace routing in `ui-shell.js` —
  stop; keep the fix inside `studio.js`.

## Maintenance notes

Reviewers: Codex overstated that Publish reverts the preset. After this plan,
draft/preview should match the hot-activated preset. If a follow-up still sees
Publish revert, then inspect `settings.js` overlay merge — that is a separate
change.
