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
- Use Semantic Versioning:
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

## Writing guidance

- Write for streamers and users first, maintainers second.
- Describe behavior and impact, not implementation trivia.
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
