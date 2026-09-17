## Context

Command matching is exact canonical `trigger` only (`internal/command.Lookup`). Packet 1 already publishes `command_outcome` with canonical `trigger` and keys cooldown by command id. Operators want A+B: catalog aliases (INT-016) and a unique Damerau-Levenshtein ≤ 1 typo (INT-037) so `!heate` can fire `heat` without becoming a general fuzzy search.

## Goals / Non-Goals

Goals:

- Persist multiple extra slugs per command with uniqueness across the whole catalog.
- Match exact trigger or alias first; then unique distance ≤ 1 when the canonical trigger is ≥ 4 characters.
- Keep cooldown, alerts, interaction events, and `command_outcome.trigger` on the canonical command.
- Let the Audience editor save aliases and show collisions.
- Import aliases from `pack.yaml`.

Non-goals:

- “Did you mean” without firing.
- Fuzzy extra-word lines, translit, phonetics, adjacent-key maps.
- Parameterized commands.
- SQLite-backed cooldown, platform chat replies, overlay countdown.
- New WebSocket fields for match kind.

## Component / Process / IPC Boundaries

- `internal/store`: Goose `00020_command_aliases.sql`; `Command.Aliases`; uniqueness in create/update; delete cascades.
- `internal/command`: `Lookup` exact then unique typo; no API/UI knowledge.
- `internal/api` commands handler: `aliases` array; field errors `aliases` / `trigger`.
- `internal/packimport`: optional YAML `aliases`.
- `web/admin` command editor only. Overlay/dock unchanged except they already honor `is_command` and canonical outcome trigger.
- No Wails IPC, installer, or `config.json` keys.

## State and Event Flow

```
bang line → ParseLine (whole token, no spaces)
         → exact enabled trigger or alias
         → else unique Damerau≤1 among enabled commands with canonical length ≥ 4
         → miss: ordinary chat
         → hit: is_command, TryFire(command id), outcome.trigger = canonical
```

Exact token that belongs only to a disabled command is a miss (no typo fallback).

## Threading / Async / Cancellation

Same ingest path. `ListCommands` already loads under the store mutex; load aliases in that read. Matcher stays in-process. No new workers.

## Security and Trust Boundaries

Localhost catalog only. Aliases use the existing slug alphabet. Do not log chat bodies at Info; log canonical `trigger` and Debug `match` (`exact` | `alias` | `fuzzy`). Ambiguous typo is a silent skip: Debug log required.

## Decisions and Alternatives

1. **Child table `command_aliases`, not JSON on `commands`.** UNIQUE on `alias` plus application checks against `commands.trigger`. Rationale: list/query uniqueness without parsing JSON; delete command removes aliases via FOREIGN KEY.

2. **Uniqueness across enabled and disabled names.** Stricter than the packet’s “enabled” wording. Rationale: current `commands.trigger` UNIQUE is already global; avoiding landmines when enabling a colliding row.

3. **Exact first, then unique typo.** Aliases are operator-declared names; typos are a fallback. Disabled exact names do not fuzzy to a neighbor.

4. **Canonical length ≥ 4 gates the whole command**, including alias tokens, so `gg` / `hi` never typo-match. Distance is min(canonical trigger, aliases). Same command via two tokens is one winner.

5. **Cap 16 aliases.** Enough for operator nicknames; keeps the editor and uniqueness scan small.

6. **No `match_kind` on the wire.** Overlay shows typed text; outcome already uses canonical trigger. Debug log is enough.

7. **Omitted `aliases` means empty list** on create and update (full replace), matching how the editor posts the whole form.

## Risks / Trade-offs

- Two long neighbors (`heat` / `heal`) will swallow some typos; that is the unique-winner rule.
- Damerau includes adjacent transposition; one substitution/insertion/deletion also matches. Acceptable for this packet.
- Global uniqueness can reject a disabled-row alias the operator considers “unused”; better than runtime surprise.

## Migration / Rollout / Rollback

Upgrade: migration creates empty `command_aliases`; behavior unchanged until aliases are saved or a ≥4-character typo is unique. Downgrade: older binaries ignore the table and match exact triggers only; alias rows remain until a later upgrade. No installer step.

## Open Questions

None. Operator packet already chose A+B, Damerau ≤ 1, trigger ≥ 4, unique winner, and canonical cooldown/outcome.
