## Context

`/overlay/leaderboard` fills its Browser Source but currently sets one fixed font variable, keeps several chrome dimensions in unrelated pixels, renders `COMMRELAY RANKING` from CSS, and creates a separate heading for custom text. Rows place XP and message count together in a small secondary line. The recent title and five-row cap are preset surface overrides; this change refines them without changing ranking data or visibility.

## Goals / Non-Goals

**Goals:** make OBS rectangle sizing intuitive; scale the whole leaderboard coherently; fit complete rows by height; give themes one title slot; emphasize XP; keep message count optional; preserve explicit legacy overrides.

**Non-Goals:** visibility automation, command behavior, ranking order, periods, XP rules, new themes, chat/alert typography, or an OBS plugin.

## Component / Process / IPC Boundaries

Config and Studio own persistent presentation choices. Shared overlay-settings resolution maps legacy and current fields into one view model. The leaderboard page owns runtime measurement and rendering. Existing HTTP and `/ws` ranking payloads remain unchanged and already contain enough rows up to `max_entries`. There is no native IPC or backend worker.

## State and Event Flow

1. Studio normalizes a preset into sizing, title, secondary-metric, layout, and cap controls.
2. Preview URL parameters apply the unpublished draft through the existing sample page.
3. The live page resolves the published preset and query overrides.
4. A resize observer measures the root; one pure fit function selects a bounded scale and complete visible-row count.
5. Ranking or appearance updates reuse the latest measurement and recalculate without scrollbars.

## Threading / Async / Cancellation

Resize work is page-local and coalesced to one animation frame. Disconnecting the observer and canceling a pending frame on unload prevents stale work. Existing fetch/WebSocket reconnect behavior is unchanged.

## Security and Trust Boundaries

Title and viewer names are assigned through `textContent`; no HTML is accepted. Query values remain bounded and allowlisted. No new network origin, upload, secret, or filesystem path is introduced.

## Decisions and Alternatives

1. **Width drives scale; height drives capacity.** This matches the operator's rectangle mental model. Scaling from both dimensions was rejected because a taller source would enlarge rows instead of revealing more ranks.
2. **One bounded scale token.** JS computes a clamped value and CSS derives row/chrome sizes with relative units. Scattered viewport units were rejected as unpredictable in narrow banners.
3. **Complete-row fitting up to the existing cap.** `max_entries` stays default 5 for compatibility; operators may raise it to 20. Treating height as an unbounded database query was rejected.
4. **Three title states.** Missing legacy title resolves to theme, non-blank legacy title to custom, and explicit hidden is new. This separates fallback from suppression.
5. **One semantic title element.** Theme CSS styles it; generated-content copy is removed. Custom text therefore replaces theme text without replacing theme typography.
6. **XP is primary; messages default off.** `message_count` remains in data and tie-breaking but is not visually equal to progress.
7. **Explicit query font remains fixed.** Pinned troubleshooting URLs retain deterministic behavior while normal presets default to auto unless they contain a legacy leaderboard font override.

## Risks / Trade-offs

- Resize measurements can oscillate near a row boundary; use stable rounding/hysteresis and test exact thresholds.
- Very long titles consume capacity; wrapping remains allowed, but fit must reserve measured title height.
- Theme chrome may expose hard-coded pixel remnants; every theme × layout needs rectangle smoke coverage.
- Existing presets without a custom leaderboard font will visibly become responsive; this is intentional and release-noted.

## Migration / Rollout / Rollback

Config fields are additive and need no file rewrite. Old binaries ignore them. New binaries derive compatibility from existing `font_size_px` and title presence. Rollback restores old rendering while leaving inert unknown fields. Update README sizing instructions and refine the current Unreleased leaderboard/overlay bullet rather than duplicating it.

## Open Questions

None.
