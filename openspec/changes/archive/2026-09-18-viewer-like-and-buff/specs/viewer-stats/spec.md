## MODIFIED Requirements

### Requirement: Operator awards add score independently of chat ingest
When an award grant succeeds, including a successful viewer `like` command grant of a catalog award, the system SHALL add the award `points` to the **recipient** canonical viewer's `xp` for all-time, the current stream session, and the current stats day. A successful buff SHALL add the buff command `points` to the recipient the same way. Command matching of `alert` and `show_leaderboard` MUST NOT change `xp`. The giver of a like or buff MUST NOT receive XP from that action.

#### Scenario: Advice during a session
- **WHEN** a viewer with session XP 3 is granted Advice (50) by the operator
- **THEN** session, day, and all-time `xp` each increase by 50 and `message_count` is unchanged by the grant

#### Scenario: Leaderboard updates
- **WHEN** an award grant succeeds
- **THEN** subsequent leaderboard snapshots include the new `xp` without waiting for another chat line

#### Scenario: Peer like
- **WHEN** Alice successfully likes Bob with bound award points 5
- **THEN** Bob's session, day, and all-time `xp` each increase by 5
- **AND** Alice's XP is unchanged by that like

#### Scenario: Buff
- **WHEN** Alice successfully buffs Bob's operator award by 5 points
- **THEN** Bob's session, day, and all-time `xp` each increase by 5
- **AND** Alice's XP is unchanged by that buff
