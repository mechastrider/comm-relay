## Context

See `proposal.md`. Commands today match a whole bang line (`alert` or `show_leaderboard`) and MUST NOT grant XP. Operator awards are the only contribution XP path besides capped activity. `command_outcome` is `fired` or `cooldown`; extra words and ambiguous trigger typos stay ordinary chat. Levels are titles only. This change adds two social actions that resolve a nick, grant or add XP to another viewer, and reject with a visible reason.

## Goals / Non-Goals

**Goals:**

- Catalog `like` and `buff` actions with optional/required nick remainder.
- Buff only the latest operator award (session-global or per resolved viewer).
- Peer like as a bound catalog award grant to the recipient.
- Level session quotas, per-award unique-buffer and per-viewer-per-award caps.
- Unique-winner nick pipeline with same-platform exact exception.
- `rejected` outcomes on the chat line; no platform replies.

**Non-Goals:**

- Buffing likes, activity XP, or skipping to older awards.
- Community Awards / platform reactions, Credits, rules engine.
- Transliteration, candidate name lists, self-target toggle.
- New OBS URLs, connector send path, overlay countdown for rejections.

## Component / Process / IPC Boundaries

```text
connectors → bus ChatMessageReceived
                 ├─ hub Lookup (first token) → message { is_command }
                 └─ ingest:
                      parse trigger + remainder
                      social action → resolve nick / target award
                      quota + caps + self
                      like → existing award grant (recipient)
                      buff → XP + kind=buff event (recipient)
                      command_outcome fired | cooldown | rejected

config.json     buffs_per_award_per_viewer, buff_max_unique_viewers
SQLite          commands.action/points/award_id
                levels.like_quota/buff_quota
                interaction_events kind buff
                session social-use counters
```

Desktop and headless share the HTTP app. No extra OS process. Overlay stays a Browser Source client of `/ws`.

## State and Event Flow

1. Parse `!token` plus remainder (remainder may contain spaces). Non-social commands still require an empty remainder.
2. Exact / alias / unique typo apply to **token only**.
3. Cooldown (per giver, per command id) runs before social checks; cooldown does not consume quota.
4. Social checks: missing nick, nick pipeline, self, target award exists, quota, already_buffed, award_full.
5. Success: persist XP + events atomically, then `fired`, like award alert if like, leaderboard snapshots.
6. Failure: `rejected` + reason; quota unchanged for cap/self/not_found/ambiguous/missing_arg/no_award.

## Threading / Async / Cancellation

Ingest remains the only consumer that mutates cooldown, quota, and awards. Nick lookup and award targeting run under the store mutex in one transaction with XP. Outcome map stays process-local (extend with `reason`). Shutdown drops the map; SQLite keeps quotas, buffs, and likes. Cancelled HTTP is unrelated; chat ingest cancellation follows existing connector shutdown.

## Security and Trust Boundaries

Localhost-only. Nick strings and reason labels are untrusted display text: overlay/admin use text nodes. No platform reply, so no outbound chat injection. Do not log full chat bodies at Info; log canonical trigger, reason, giver/recipient viewer ids. Config caps are integers; SQL stays parameterized.

## Decisions

### 1. Social actions are catalog `action` values, not hardcoded triggers

**Choice:** Operator owns trigger/aliases/`like` award binding/`buff` points. Seeds `like` and `buff` are deletable.  
**Why:** Matches user-owned catalog.  
**Alt:** Frozen `!like`/`!buff` in code. Rejected.

### 2. Buff XP is command `points`; like XP is bound award points

**Choice:** Buff has its own points field. Like reuses grant of `award_id`.  
**Why:** Operator asked for catalog points like awards; like should appear in reward history.  
**Alt:** Single `social_points` config. Weaker per-command control.

### 3. Operator awards only

**Choice:** Target = latest `award` event from operator grant or contract settlement in the open session, not `viewer_like`.  
**Why:** User: do not complicate.  
**Alt:** Buff last any award. Rejected for v1.

### 4. Caps: 1 per viewer per award, 5 unique viewers, both config.json

**Choice:** Defaults 1 and 5; 0 unique cap disables buffing; 0 per-viewer cap rejects as `already_buffed`. Rejections do not consume session quota.  
**Why:** User: defaults configurable; prevent stacking and last-award vacuum.  
**Alt:** SQLite policy table. Config already holds activity caps.

### 5. Quotas on level rows, persisted per session

**Choice:** `like_quota` / `buff_quota` on `progression_levels`; uses stored in SQLite keyed by session + viewer + action.  
**Why:** Restart must not refill; New stream resets.  
**Alt:** In-memory only (breaks restart, unlike activity XP).

### 6. Nick pipeline: normalize → exact → unique same-platform exact → unique Damerau ≤ 1 (len ≥ 4)

**Choice:** Session-active pool; no translit; ambiguous copy “уточни”/“clarify” without names. Same-platform exception uses the **command line's platform**, not any giver identity.  
**Why:** User decisions 5–6; merged viewers still have one id.  
**Alt:** Closest winner. Rejected.

### 7. `rejected` shares overlay freeze with cooldown

**Choice:** Same 5 s freeze and `hide_command_cooldown_overlay`. Admin/dock show reason, no countdown.  
**Why:** Extend INT-034; still no platform reply.  
**Alt:** New overlay flag. Unnecessary for v1.

### 8. No buff splash

**Choice:** Fired chat-row only; like uses award alert.  
**Why:** Five buffers must not enqueue five extra award alerts on top of Spotter.  
**Alt:** Tiny toast. Deferred.

### 9. Bootstrap missing seeds once, skip colliding triggers

**Choice:** Insert `viewer_like`, commands `like`/`buff`, achievements when ids absent; if trigger `like` or `buff` is taken, skip that command seed.  
**Why:** Upgrades should get the feature; do not overwrite operator triggers.  
**Alt:** Fresh DBs only (like streamer-like award). Too easy to miss on existing installs.

## Risks / Trade-offs

- Display-name collisions stay `ambiguous` until merge; same-platform exception only helps cross-platform duplicates.
- Session-only nick pool cannot like a lurker who never spoke and was never awarded.
- Quota + caps still allow five +5 hits on one MVP; that is the intended bound.
- Fuzzy nick distance 1 can still miss Cyrillic/latin pairs without translit (accepted).

## Migration / Rollout / Rollback

Additive SQLite migration + additive config defaults. Older binaries ignore unknown `action` and `status` `rejected`. Downgrade: new command rows may fail older validation if `action` is unknown — save path must keep unknown actions readable or operators delete social commands before downgrade. Document: disable/delete like and buff commands to roll back behavior without dropping XP already granted.

## Open Questions

None blocking. Assumed seed buff `points` 5, command cooldown 10 s, like bound to `viewer_like`, quota defaults 1…5 by starter level order.
