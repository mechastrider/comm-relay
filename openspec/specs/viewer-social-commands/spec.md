# viewer-social-commands Specification

## Purpose

Let viewers like another session viewer and buff a recent operator award through catalog chat commands, with nick resolution, session quotas, per-award caps, and explicit rejections.

## Requirements

### Requirement: Buff targets the latest operator award
An enabled command whose `action` is `buff` SHALL treat a whole-line bang with no remainder as targeting the most recent successful operator award in the open stream session. A remainder SHALL be resolved as a nick and SHALL target that canonical viewer's most recent successful operator award in the open session. Operator awards are grants created by `POST /api/awards/grant` or contract settlement. Peer `viewer_like` grants, activity XP, and command fires MUST NOT be buff targets. A successful buff SHALL add that command's positive `points` to the recipient's session, day, and all-time XP once, MUST NOT increment the original award id's grant count, MUST NOT enqueue a second splash for the original award, and MUST NOT change the giver's XP.

#### Scenario: Buff without nick
- **WHEN** the latest operator award this session is Spotter to Alice and Bob sends `!buff` outside cooldown with remaining quota
- **THEN** Alice's XP increases by the buff command `points` and clients receive status `fired`

#### Scenario: Buff with nick
- **WHEN** Carol's latest operator award this session is Advice and Dave sends `!buff carol` that uniquely resolves to Carol
- **THEN** that Advice grant is buffed once and Carol's XP increases by the buff `points`

#### Scenario: Latest grant is a peer like
- **WHEN** the latest interaction is a `viewer_like` to Alice and Bob sends `!buff`
- **THEN** the server uses the latest **operator** award instead of that like
- **AND** if no operator award exists this session, the outcome is `rejected` with reason `no_award`

#### Scenario: Named viewer has no operator award
- **WHEN** Alice has no operator award this session and Bob sends `!buff alice`
- **THEN** clients receive status `rejected` with reason `no_award` and no XP changes

### Requirement: Like requires a nick and grants a catalog award
An enabled command whose `action` is `buff` is unchanged by this requirement. An enabled command whose `action` is `like` SHALL require a non-empty nick remainder. A successful like SHALL grant the command's bound existing award type to the resolved recipient exactly as an operator grant of that type would: same points, award alert, reward-history row, and award interaction event. The giver's XP MUST NOT change. A like with no remainder MUST match as a command and MUST publish `rejected` with reason `missing_arg` rather than remaining ordinary chat.

#### Scenario: Like with nick
- **WHEN** Alice sends `!like bob` that uniquely resolves to Bob and quota remains
- **THEN** Bob receives the bound award once and clients receive status `fired`

#### Scenario: Like without nick
- **WHEN** Alice sends `!like` with no remainder
- **THEN** clients receive status `rejected` with reason `missing_arg` and no award is granted

#### Scenario: Bound award missing
- **WHEN** the like command's `award_id` no longer exists and Alice sends `!like bob`
- **THEN** clients receive status `rejected` with reason `no_award` and no XP changes

### Requirement: Social actions cannot target the giver
Like and buff MUST compare canonical viewer ids. If the resolved recipient is the giver, the server MUST publish `rejected` with reason `self`, MUST NOT consume session quota, and MUST NOT add XP. `!buff` without a nick MUST reject with `self` when the latest operator award's recipient is the giver and MUST NOT skip to an older award.

#### Scenario: Like self
- **WHEN** Alice's session identity resolves `!like alice` to Alice
- **THEN** the outcome is `rejected` with reason `self`

#### Scenario: Buff own latest award
- **WHEN** the latest operator award this session was granted to Alice and Alice sends `!buff`
- **THEN** the outcome is `rejected` with reason `self` and that award is unchanged

### Requirement: Session quotas come from the giver's level
Each level catalog row SHALL persist non-negative integers `like_quota` and `buff_quota`. A successful like or buff SHALL consume one use of that action for the giver in the open session. When the giver's remaining quota for that action is 0, the server MUST publish `rejected` with reason `quota` without granting XP. Quota 0 on the current level SHALL mean the action is unavailable. Starting a new stream session SHALL reset remaining quotas. A process restart MUST preserve remaining quotas for the still-open session. Like and buff quotas MUST be independent.

#### Scenario: Quota exhausted
- **WHEN** Alice's level `like_quota` is 1, she has already liked once this session, and she sends another valid `!like bob`
- **THEN** the outcome is `rejected` with reason `quota` and Bob's XP is unchanged

#### Scenario: Independent quotas
- **WHEN** Alice has spent her like quota and still has buff quota
- **THEN** a valid `!buff` may still fire

#### Scenario: New stream resets quota
- **WHEN** the operator starts a new stream after Alice spent her buff quota
- **THEN** Alice's buff remaining returns to her current level's `buff_quota`

### Requirement: One award accepts a limited unique buff set
The operator SHALL configure `buffs_per_award_per_viewer` (default 1, integer ≥ 0) and `buff_max_unique_viewers` (default 5, integer ≥ 0). After a viewer successfully buffs an operator award, further buffs of that same award by the same viewer MUST publish `rejected` with reason `already_buffed` until a different award is targeted. When the number of distinct viewers who successfully buffed that award is at least `buff_max_unique_viewers`, further buffs MUST publish `rejected` with reason `award_full`. `buff_max_unique_viewers` 0 MUST disable successful buffing (every buff rejects `award_full`). `buffs_per_award_per_viewer` 0 MUST reject every buff as `already_buffed`. These rejections MUST NOT consume session quota.

#### Scenario: Second buff of the same award
- **WHEN** Alice already buffed the latest Spotter and sends `!buff` again while quota remains
- **THEN** the outcome is `rejected` with reason `already_buffed` and quota is unchanged

#### Scenario: Sixth unique buffer at default cap
- **WHEN** five distinct viewers have buffed an award, `buff_max_unique_viewers` is 5, and Eve sends a valid `!buff` targeting it
- **THEN** the outcome is `rejected` with reason `award_full` and Eve's quota is unchanged

### Requirement: Nick resolution uses a unique-winner pipeline
The nick remainder SHALL be the trimmed text after the trigger token, including spaces, with a single leading `@` stripped. Candidates SHALL be visible canonical viewers who have a counted message or an operator award in the open session. Each candidate's keys SHALL be the operator override display name plus every identity username and display name. Matching SHALL normalize keys and the query with Unicode NFKC, Unicode casefold, then keep only letters and digits (drop spaces, `_`, `-`, emoji, and other punctuation). Queries shorter than 2 characters after normalize MUST reject `not_found`.

The server SHALL then: (1) collect exact normalized key matches; if exactly one viewer, that viewer wins; if several, win only when exactly one of them has an identity on the same platform as the command chat line; otherwise reject `ambiguous`; (2) if none, and the normalized query length is at least 4, collect Damerau-Levenshtein distance ≤ 1 against normalized keys; if exactly one viewer, that viewer wins; if several or none, reject `ambiguous` or `not_found` respectively. Ambiguous outcomes MUST use operator locale copy `уточни` or `clarify` and MUST NOT name candidates or pick a closest winner. Transliteration MUST NOT be applied.

#### Scenario: Unique exact
- **WHEN** session viewer Bob has username `bob` and Alice sends `!like Bob`
- **THEN** Bob is selected and the like may proceed if other rules pass

#### Scenario: Same nick on two platforms, unique on the line's platform
- **WHEN** Twitch Bob and YouTube Bob both match exact `bob` and Alice's line is Twitch with only the Twitch identity on that platform
- **THEN** Twitch Bob is selected

#### Scenario: Ambiguous exact without a unique same-platform winner
- **WHEN** two session viewers both match exact `alice` on YouTube and a YouTube line is `!like alice`
- **THEN** the outcome is `rejected` with reason `ambiguous`

#### Scenario: Unique typo
- **WHEN** only session viewer `alice` is at Damerau distance 1 from `alicx` (length ≥ 4) and no exact match exists
- **THEN** Alice is selected

#### Scenario: Two typos in band
- **WHEN** `Alice` and `Alicia` are both distance 1 from `alicx`
- **THEN** the outcome is `rejected` with reason `ambiguous`

#### Scenario: Not in this session
- **WHEN** Carol exists in Audience but has no message or operator award this session and Alice sends `!like carol`
- **THEN** the outcome is `rejected` with reason `not_found`

### Requirement: Social rejections are visible without platform replies
A matched like or buff with a stable identity SHALL publish exactly one `command_outcome`: `fired`, `cooldown`, or `rejected`. Rejected and cooldown matches MUST NOT grant XP, MUST NOT write a successful-command achievement fact, and MUST NOT reply on a streaming platform. Overlay rejected rows SHALL follow `hide_command_cooldown_overlay` using the same short frozen duration as cooldown. Admin and dock MUST show the reason. Empty-identity lines MUST keep current diagnostics and MUST NOT produce viewer-facing social effects.

#### Scenario: Ambiguous nick on overlay
- **WHEN** `hide_command_cooldown_overlay` is false and a viewer sends an ambiguous `!like alicx`
- **THEN** `/overlay` shows a short frozen row and admin/dock show reason `ambiguous`
- **AND** no platform chat reply is sent
