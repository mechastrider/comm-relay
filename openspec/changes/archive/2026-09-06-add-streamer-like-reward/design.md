## Context

See `proposal.md` for motivation. Starter awards are inserted only while a database is in the fresh-catalog bootstrap state; afterward the award catalog is user-owned. Alert emblems are shared by the live alert page and its previews, so the new semantic graphic must come from the existing shared emblem module.

## Goals / Non-Goals

**Goals:**

- Extend only newly initialized localized starter catalogs with `like` and the revised Advice value.
- Preserve existing catalogs byte-for-byte at the award-field level.
- Reuse the current built-in emblem and sound mechanisms without adding stored assets or dependencies.

**Non-Goals:**

- Migrating, repairing, translating, or re-seeding existing award catalogs.
- Viewer-to-viewer likes, reaction counts, thresholds, rate limits, or automated grants.
- Adding an award-specific API or database column.

## Decisions

### Keep the change inside fresh-catalog bootstrap

Add `like` and change Advice to 25 only in the localized starter definitions reached by a confirmed fresh-database bootstrap. Historical schema migrations create the original Joke and Advice rows even for a new database, so the pending-bootstrap conflict path must replace the complete starter profile, including points, sound, and duration. Existing databases without bootstrap metadata are marked initialized and return before that path. Do not add a SQL migration or post-bootstrap reconciliation. This preserves the existing rule that seeded rows become ordinary user-owned data after initialization. A migration was rejected because it would reinsert a deleted seed or overwrite an operator's chosen points.

### Use stable id `like` with a low-value recognition profile

The starter row uses id `like`, 5 points, built-in `soft` sound, and 5000 ms duration in both locales. Five points makes it a lightweight acknowledgement below the more specific contribution awards, while a shared technical profile keeps behavior consistent across translations.

### Render the icon through the shared semantic emblem map

Map `like` to a new outlined thumbs-up and four-point sparkle symbol in the shared alert-emblem module. This keeps live alerts and previews identical and allows the existing custom-image override and failure fallback paths to work unchanged. A bitmap asset was rejected because the current starter symbols are themeable inline SVG and must remain crisp at arbitrary overlay sizes.

## Risks / Trade-offs

- [Existing users will not receive the new reward automatically] → Document the fresh-catalog-only behavior and leave manual creation available through the existing catalog editor.
- [Fresh and existing installations can have different Advice values] → Treat this as the intentional consequence of user ownership; never silently rewrite operator data.
- [A thumb icon can read as a generic social reaction] → Pair the sparkle with the localized “from streamer” name and keep mutual-like mechanics explicitly out of scope.

## Migration Plan

Ship the new starter definitions and shared emblem with no schema or data migration. Rollback removes the definition for future fresh databases and the emblem mapping; catalogs already initialized by the new version remain user-owned and are not rewritten.
