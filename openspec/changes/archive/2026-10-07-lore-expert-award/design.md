# Design

## Context

See proposal.md for motivation. Starter catalogs use persistent bootstrap markers; the on-point award establishes the precedent for additions on upgrades. Both React admin and static OBS alerts consume shared emblem shapes.

## Goals / Non-Goals

**Goals:** Add one award without changing existing catalog entries, preserve its initialization locale across interrupted startup, and reuse normal grant behavior.

**Non-Goals:** Achievements, automated lore detection, new picker controls, schema changes, or rebalancing other awards.

## Decisions

- Use a dedicated `lore_expert_catalog_initialized` marker and transactional insert-if-absent. Prepare a pending locale before migrations regardless of schema version, since this addition has no Goose migration. Persist award and completion marker together. Repeated unconditional seeding would incorrectly restore deletions.
- Keep the seed in the dedicated initializer rather than duplicating it in the original starter list. It runs for new and upgraded databases alike.
- Use `lore_expert`, Russian `Знаток лора`, English `Lore Expert`, 50 points, `chime`, 5000 ms, explicit `fullscreen` layout, and locale-specific `{viewer}` / `{points}` templates.
- Add an `open-book` symbol to the shared SVG map so admin and OBS show the same text-free emblem. Existing custom media precedence stays intact.

## Risks / Trade-offs

- Existing custom id collision → adopt the existing row without changes.
- Interrupted startup or locale change → use the persisted pending locale and test reopening.
- Catalog growth → award remains editable and deletable; no permanent UI control is added.

## Migration Plan

Startup adds the row once. No schema migration is necessary. Older binaries can still read the ordinary award row; operator deletion is supported. Verify fresh locales, upgrades, preserved customizations, deleted rows, restart recovery, grant delivery, and emblem rendering.
