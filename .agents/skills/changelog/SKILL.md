---
name: changelog
description: Maintains CommRelay CHANGELOG.md and release notes. Use when preparing releases, editing CHANGELOG.md, writing version entries, or summarizing user-facing changes.
---

# Changelog

## When to use

Use this skill whenever a task changes `CHANGELOG.md`, prepares a release, writes GitHub release notes, or asks what changed between versions.

## Format

- Keep `CHANGELOG.md` in Russian unless the file is intentionally converted to English.
- Follow Keep a Changelog style with version headings:
  - `## [Unreleased]`
  - `## [0.1.0] - YYYY-MM-DD`
- Semantic Versioning:
  - patch for bug fixes and small documentation corrections,
  - minor for user-visible features or release packaging changes,
  - major for breaking config, API, or workflow changes.

## Entry checklist

For each version, prefer these sections when relevant:

- `### Добавлено`
- `### Изменено`
- `### Исправлено`
- `### Удалено`
- `### Безопасность`
- `### Известные ограничения`
- `### Миграция`

Only include sections that have content.

## Gate: write a bullet only if a streamer would notice

Before adding or keeping any `[Unreleased]` bullet, answer:

> Would a streamer or OBS operator notice this change without reading the code, PR, or commit message?

- **Yes** → write a short Russian bullet about **behavior / impact** (what they see or must do).
- **No** → **do not** add a changelog entry. Pure refactors, file splits, ES modules, package renames, extract helpers, lint/test-only, agent/tooling, internal wiring, and **marketing/repo presentation** (README promo or hero images, banners, social graphics, screenshots with no new product behavior) belong in the commit/PR — not in `CHANGELOG.md`.

Touching `web/admin`, `web/overlay`, or connectors is **not** enough by itself. Changelog only when the **product behavior** for the user changes (new control, visible layout/theme change, bug they could hit, config/API they use).

## Do not write (implementation trivia)

Ban these from changelog bullets (including “без изменения поведения” apologies):

- Repo or URL paths (`/shared/...`, `web/admin/js/...`, `internal/...`, `docs/images/poster.jpg`)
- Package, module, or file names; “разложено на ES-модули”, “extract”, “refactor”, “god-module”
- Architecture/CI/lint details, test names, skill/agent notes
- Lists of internal helpers or package renames with no user-facing effect

Mention a path only when the user must open or configure that exact URL (e.g. new OBS dock at `/dock/messages`).

## Preserve versioned history

When editing `[Unreleased]`:

- **Never** delete, rewrite, or demote an existing `## [X.Y.Z] - …` section.
- **Never** move released bullets into `[Unreleased]` or remove the version heading while inserting Unreleased notes.
- Append or edit **only** under `## [Unreleased]`. Leave older version sections untouched unless the user is deliberately correcting a published release note.

## Writing guidance

- Write for streamers and users first, maintainers second.
- Describe behavior and impact, not how it was implemented.
- Before appending a new `[Unreleased]` bullet, scan existing `[Unreleased]` entries. If the work refines, renames, or extends an unreleased feature already listed, edit that existing bullet instead of adding a separate one.
- Add a new `[Unreleased]` bullet only for a distinct user-facing change, or when no existing unreleased entry can naturally absorb it.
- Mention setup or migration steps explicitly when users must do something after updating.
- Keep known limitations honest: unsigned builds, OAuth setup, platform dependencies, or manual smoke gaps belong in release notes.
- Do not include secrets, local paths with usernames, or noisy internal file lists.

## Release workflow

Before finalizing a release entry:

1. Confirm the version and date.
2. Add user-facing notes under `## [Unreleased]` in `CHANGELOG.md` (do not create the version heading manually unless re-publishing).
3. Group changes by user-facing outcome.
4. Add any install, update, or compatibility notes.
5. Ensure README release instructions and GitHub workflow artifact names still match the changelog.

On GitHub Release, `.github/workflows/release.yml` runs `scripts/prepare-changelog.sh` to promote `[Unreleased]` to `[X.Y.Z] - date`, commit to `main`, and feed GitHub Release notes from the new section.
