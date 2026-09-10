## Why

Streamers currently recognize useful viewer contributions only after they happen. `INT-017` calls for a small, operator-led experiment that can announce a concrete task to the audience, keep one promise visible during the stream, and settle it with the existing reward/XP system. This tests whether viewer contracts are useful before CommRelay invests in predictions, automatic rules, or another economy.

## Users and Supported Platforms

The feature is controlled by the local streamer or OBS operator. A winner may be any canonical viewer known through Twitch, YouTube Live, or VK Live; connector-specific participation logic is not added.

## What Changes

- Add a Live workspace for drafting and manually announcing one viewer contract with a title, objective, and existing catalog reward.
- Persist the active contract across restart and expose explicit actions to award a canonical viewer or close without a result.
- Snapshot the promised reward at announcement so catalog edits cannot change an active contract's displayed or granted terms.
- Present a brief announcement through the existing alert Browser Source, then keep the active objective visible by temporarily replacing content in the existing leaderboard Browser Source.
- Keep the ordinary leaderboard visibility behavior intact and place its icon actions, the contract/ranking switcher, and repeat-announcement action in one compact horizontal row.
- Reject conflicting/stale lifecycle actions and make successful lifecycle transitions observable without storing chat content.

## Capabilities

### New Capabilities
- `viewer-contracts`: Single-active-contract lifecycle, local persistence, API actions, validation, and atomic settlement.

### Modified Capabilities
- `admin-and-dock`: Live operator workflow, accessible winner selection, and icon-only contract presentation controls in the messages dock.
- `operator-rewards`: Catalog reward snapshots can be granted through contract settlement.
- `interaction-events`: Contract settlement records a normal durable award event with contract provenance.
- `viewer-reward-history`: Contract awards appear in the existing operator journal.
- `websocket-feed`: Contract announcements and an authoritative active-presentation snapshot use backward-compatible envelopes.
- `overlay-alerts`: Render contract announcements without disrupting award-priority queue behavior.

## Scope / Non-Goals

No viewer command entry, automatic winner detection, multiple concurrent contracts, contract history UI, predictions, voting, spendable currency, platform chat posting, generic rules engine, or new reward catalog is included.

## Impact

Adds local SQLite state and POST-action/GET API routes, plus admin, dock, leaderboard, and alert UI. Contract presentation is process-local and resets to a visible contract card after restart; the ordinary leaderboard controls govern visibility while an independent icon switcher chooses contract or ranking content. The durable contract remains authoritative. Contract text is local operator-authored content, escaped in clients, length-bounded, and never sent to a cloud service. Existing configs and clients remain compatible. Packaging is unchanged; upgrades run an additive database migration and can roll back only before new-schema data is required.
