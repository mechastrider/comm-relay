# Admin migration acceptance inventory

Current specs remain the behavior authority. The table maps every requirement to its implementation owner and reviewed regression evidence. “Retained” means the production implementation is unchanged; backend guarantees are covered by the full Go race suite rather than being reimplemented in React. Browser suites exercise representative end-to-end workflows; code review covers the remaining controls/branches. This is not a claim that each row has its own browser test.

Evidence keys: **W** = `web/e2e/workflows.spec.ts`; **M** = `media-and-settings.spec.ts`; **L** = `live-events.spec.ts`; **R** = `resilience.spec.ts`; **V** = `admin.spec.ts` + `parity.spec.ts` (24 original screenshots); **U** = Vitest + migrated pure-model Node tests; **S** = unchanged OBS/dock/shared Node tests; **G** = `go test ./... -race -count=1`; **N** = native Linux Wails launch/save/cancel, `evidence/`. Paths in the owner column are relative to `web/admin/src/` unless stated otherwise.

| Source | Requirement | React owner | Verification |
|---|---|---|---|
| admin-and-dock | Admin console manages live operation, audience, OBS setup, and settings | features/studio | Code review; W; U; V; R (dedicated test API remains separate) |
| admin-and-dock | Interface language is Russian or English | app/Shell; locale; save-status; components; preserved styles | Code review; V; L; M; R; U |
| admin-and-dock | Dock is a messages-only live log | web/dock (retained) | S; R surface smoke; G |
| admin-and-dock | Admin and dock show accepted versus frozen command lines | web/dock (retained) | S; R surface smoke; G |
| admin-and-dock | Settings can hide overlay cooldown rows | features/settings | Code review; W; M; L; R; U |
| admin-and-dock | Deletion controls appear only for stable source IDs | features/live/MessagesProvider; Messages; MessageActions | Code review; L; R; U; S |
| admin-and-dock | Admin new-message sound is optional | features/settings | Code review; W; M; L; R; U |
| admin-and-dock | Studio selection is a single on-stream surface | features/studio | Code review; W; U; V; R (dedicated test API remains separate) |
| admin-and-dock | Studio offers Essentials and All settings density modes | features/studio | Code review; W; U; V; R (dedicated test API remains separate) |
| admin-and-dock | Studio inspector discloses appearance in layers | features/studio | Code review; W; U; V; R (dedicated test API remains separate) |
| admin-and-dock | Add to OBS is a dismissible setup sheet | features/studio | Code review; W; U; V; R (dedicated test API remains separate) |
| admin-and-dock | Studio edits a look; Live activates the on-air look | features/studio | Code review; W; U; V; R (dedicated test API remains separate) |
| admin-and-dock | Appearance preview offers a shared backdrop set | features/studio | Code review; W; U; V; R (dedicated test API remains separate) |
| admin-and-dock | Appearance studio previews the selected on-stream surface | features/studio | Code review; W; U; V; R (dedicated test API remains separate) |
| admin-and-dock | New stream requires confirmation | features/live; components/NewStream | Code review; W; M; L; R |
| admin-and-dock | Admin actions expose their persistence timing | app/Shell; locale; save-status; components; preserved styles | Code review; V; L; M; R; U |
| admin-and-dock | Live status reports only observable application facts | features/studio | Code review; W; U; V; R (dedicated test API remains separate) |
| admin-and-dock | Existing capabilities remain reachable after redesign | app/Shell; locale; save-status; components; preserved styles | Code review; V; L; M; R; U |
| admin-and-dock | Audience hosts two catalogs | features/catalog | Code review; W; M; U |
| admin-and-dock | Catalog editors expose templates, media, and layout | features/catalog | Code review; W; M; U |
| admin-and-dock | Audience table headers are a distinct sortable surface | features/audience/Viewers; ViewerDetail | Code review; W; L; V; U |
| admin-and-dock | Audience directory shows participating streams | features/audience/Viewers; ViewerDetail | Code review; W; L; V; U |
| admin-and-dock | Audience row activation opens the viewer card | features/audience/Viewers; ViewerDetail | Code review; W; L; V; U |
| admin-and-dock | Audience list shows unique platform icons | features/audience/Viewers; ViewerDetail | Code review; W; L; V; U |
| admin-and-dock | Audience New stream is separate from filters | features/audience/Viewers; ViewerDetail | Code review; W; L; V; U |
| admin-and-dock | Messages offer Reward next to delete | features/live/MessagesProvider; Messages; MessageActions | Code review; L; R; U; S |
| admin-and-dock | Active Live data follows leaderboard events | features/live; components/NewStream | Code review; W; M; L; R |
| admin-and-dock | Reward action reports success in context | features/live/MessagesProvider; Messages; MessageActions | Code review; L; R; U; S |
| admin-and-dock | Settings expose activity instead of points per message | features/settings | Code review; W; M; L; R; U |
| admin-and-dock | Catalog selection is persistent and distinguishable | features/catalog | Code review; W; M; U |
| admin-and-dock | New stream aligns with the Live toolbar | features/live; components/NewStream | Code review; W; M; L; R |
| admin-and-dock | Audience directory shows viewer portraits | features/audience/Viewers; ViewerDetail | Code review; W; L; V; U |
| admin-and-dock | Viewer card manages custom portrait and ranking visibility | features/audience/Viewers; ViewerDetail | Code review; W; L; V; U |
| admin-and-dock | Settings can disable custom portraits | features/settings | Code review; W; M; L; R; U |
| admin-and-dock | Studio leaderboard inspector edits title and rank cap | features/studio | Code review; W; U; V; R (dedicated test API remains separate) |
| admin-and-dock | Settings configure global leaderboard visibility | features/settings | Code review; W; M; L; R; U |
| admin-and-dock | Message dock provides compact leaderboard controls | web/dock (retained) | S; R surface smoke; G |
| admin-and-dock | Command editor supports like and buff actions | features/catalog | Code review; W; M; U |
| admin-and-dock | Settings expose buff caps | features/settings | Code review; W; M; L; R; U |
| admin-and-dock | Level editor exposes social quotas | features/audience/Progression; ViewerDetail | Code review; W; U; G |
| admin-and-dock | Command editor supports leaderboard actions | features/catalog | Code review; W; M; U |
| admin-and-dock | Command editor manages aliases | features/catalog | Code review; W; M; U |
| admin-and-dock | Audience includes a global reward-history view | features/audience/History | Code review; L; U (paging/cancellation); G |
| admin-and-dock | Viewer card shows participating streams | features/audience/Viewers; ViewerDetail | Code review; W; L; V; U |
| admin-and-dock | Viewer detail includes that viewer's reward history | features/audience/History | Code review; L; U (paging/cancellation); G |
| admin-and-dock | Reward history remains operator-only | features/audience/History | Code review; L; U (paging/cancellation); G |
| admin-and-dock | Live provides a viewer contracts workspace | features/live/Contracts | Code review; W; U; G |
| admin-and-dock | Winner selection is deliberate and accessible | features/live/Contracts | Code review; W; U; G |
| admin-and-dock | The messages dock controls active contract presentation | web/dock (retained) | S; R surface smoke; G |
| admin-and-dock | Audience contains a dedicated Greetings catalog | features/catalog/Greetings; features/audience/ViewerDetail | Code review; W; M; U |
| admin-and-dock | Greeting editor mirrors alert-command presentation controls | features/catalog/Greetings; features/audience/ViewerDetail | Code review; W; M; U |
| admin-and-dock | Template variables are discoverable and bounded | features/catalog | Code review; W; M; U |
| admin-and-dock | Unsaved admin drafts use an application confirmation dialog | app/Shell; locale; save-status; components; preserved styles | Code review; V; L; M; R; U |
| admin-and-dock | Test uses the isolated alert test audience | features/audience/Viewers; ViewerDetail | Code review; W; L; V; U |
| admin-and-dock | Viewer detail can suppress automatic greetings | features/catalog/Greetings; features/audience/ViewerDetail | Code review; W; M; U |
| admin-and-dock | Audience provides a dedicated progression workspace | features/audience/Progression; ViewerDetail | Code review; W; U; G |
| admin-and-dock | Audience Archive lists durable stream sessions | features/audience/Archive | Code review; M; U (paging/cancellation) |
| admin-and-dock | Audience Archive opens a session recap card | features/live/Recap; recap-image | Code review; W; M; R; N |
| admin-and-dock | Achievement administration uses the catalog editor pattern | features/audience/Progression; ViewerDetail | Code review; W; U; G |
| admin-and-dock | Level administration preserves a valid ordered catalog | features/audience/Progression; ViewerDetail | Code review; W; U; G |
| admin-and-dock | Unlock alert settings are shared and testable | features/audience/Progression; ViewerDetail | Code review; W; U; G |
| admin-and-dock | Viewer surfaces summarize progression | features/audience/Progression; ViewerDetail | Code review; W; U; G |
| admin-and-dock | Progression adds no permanent Live or dock surface | web/dock (retained) | S; R surface smoke; G |
| admin-and-dock | Live offers explicit recap controls | features/live/Recap; recap-image | Code review; W; M; R; N |
| admin-and-dock | Live exposes compact session history | features/audience/History | Code review; L; U (paging/cancellation); G |
| admin-and-dock | Studio previews and configures the recap surface | features/studio | Code review; W; U; V; R (dedicated test API remains separate) |
| admin-and-dock | OBS setup exposes the dedicated recap URL | features/studio | Code review; W; U; V; R (dedicated test API remains separate) |
| admin-and-dock | Dock remains unchanged | web/dock (retained) | S; R surface smoke; G |
| admin-and-dock | Dedicated overlay test surfaces work without Studio test panel | features/studio | Code review; W; U; V; R (dedicated test API remains separate) |
| admin-and-dock | Production OBS URL copy remains unchanged | features/studio | Code review; W; U; V; R (dedicated test API remains separate) |
| admin-and-dock | Recap dialog switches session and all-time windows | features/live/Recap; recap-image | Code review; W; M; R; N |
| admin-and-dock | Recap dialog can download an opaque share image | features/live/Recap; recap-image | Code review; W; M; R; N |
| admin-design-system | Admin styling uses a layered token system | app/Shell; locale; save-status; components; preserved styles | Code review; V; L; M; R; U |
| admin-design-system | Shared controls are keyboard and screen-reader accessible | app/Shell; locale; save-status; components; preserved styles | Code review; V; L; M; R; U |
| admin-design-system | Layout adapts without overlapping or clipping controls | app/Shell; locale; save-status; components; preserved styles | Code review; V; L; M; R; U |
| admin-design-system | Desktop primary navigation supports a compact icon state | app/Shell; locale; save-status; components; preserved styles | Code review; V; L; M; R; U |
| admin-design-system | Loading, empty, error, and stale states preserve workspace context | app/Shell; locale; save-status; components; preserved styles | Code review; V; L; M; R; U |
| admin-design-system | Studio layout is preview-first | features/studio | Code review; W; U; V; R (dedicated test API remains separate) |
| admin-design-system | Theme picking is visual | features/studio | Code review; W; U; V; R (dedicated test API remains separate) |
| admin-design-system | Progressive disclosure does not hide required names | app/Shell; locale; save-status; components; preserved styles | Code review; V; L; M; R; U |
| admin-design-system | Studio communicates preview and surface state | features/studio | Code review; W; U; V; R (dedicated test API remains separate) |
| admin-design-system | Studio panels share one visual grid | features/studio | Code review; W; U; V; R (dedicated test API remains separate) |
| admin-design-system | Surface rail collapse has purposeful motion | features/studio | Code review; W; U; V; R (dedicated test API remains separate) |
| admin-design-system | Familiar contextual actions use the shared icon control | app/Shell; locale; save-status; components; preserved styles | Code review; V; L; M; R; U |
| admin-design-system | Shared action buttons have physical depth | app/Shell; locale; save-status; components; preserved styles | Code review; V; L; M; R; U |
| admin-design-system | Icons do not replace necessary action labels | app/Shell; locale; save-status; components; preserved styles | Code review; V; L; M; R; U |
| chat-commands | Operator can manage a command catalog | internal/command; internal/store (retained) | G; W/M/R integration |
| chat-commands | Social command actions may take a nick remainder | internal/command; internal/store (retained) | G; W/M/R integration |
| chat-commands | Commands may declare unique aliases | internal/command; internal/store (retained) | G; W/M/R integration |
| chat-commands | Command media filenames are stored assets only | internal/command; internal/store (retained) | G; W/M/R integration |
| chat-commands | Locale-aware one-time starter commands | internal/command; internal/store (retained) | G; W/M/R integration |
| chat-commands | Server matches a whole bang command line | internal/command; internal/store (retained) | G; W/M/R integration |
| chat-commands | Exact alias matches the canonical command | internal/command; internal/store (retained) | G; W/M/R integration |
| chat-commands | Unique one-edit typo may match a long canonical trigger | internal/command; internal/store (retained) | G; W/M/R integration |
| chat-commands | Per-viewer cooldown is configurable | internal/command; internal/store (retained) | G; W/M/R integration |
| chat-commands | Commands never change score | internal/command; internal/store (retained) | G; W/M/R integration |
| chat-commands | Overlay can hide command lines globally | internal/command; internal/store (retained) | G; W/M/R integration |
| chat-commands | Matched commands publish a fired or cooldown outcome | internal/command; internal/store (retained) | G; W/M/R integration |
| chat-commands | Overlay cooldown visibility is independent of hiding successful commands | internal/command; internal/store (retained) | G; W/M/R integration |
| operator-rewards | Operator can manage an award-type catalog | internal/store; internal/api (retained) | G; W/M/R integration |
| operator-rewards | Locale-aware one-time starter awards | internal/store; internal/api (retained) | G; W/M/R integration |
| operator-rewards | Locale-aware on-point starter award | internal/store; internal/api (retained) | G; W/M/R integration |
| operator-rewards | Locale-aware viewer-like starter award | internal/store; internal/api (retained) | G; W/M/R integration |
| operator-rewards | Operator can grant an award from a chat line | internal/store; internal/api (retained) | G; W/M/R integration |
| operator-rewards | Same award type cannot be granted twice on one source message | internal/store; internal/api (retained) | G; W/M/R integration |
| operator-rewards | The same chat line may be rewarded more than once | internal/store; internal/api (retained) | G; W/M/R integration |
| operator-rewards | Reward controls appear on lines with a stable identity | internal/store; internal/api (retained) | G; W/M/R integration |
| operator-rewards | Contract settlement grants a catalog reward snapshot | internal/store; internal/api (retained) | G; W/M/R integration |
| viewer-greetings | Two fixed greeting definitions are independently configurable | internal/store; internal/bootstrap (retained) | G; W/M/R integration |
| viewer-greetings | First-ever greeting wins on a viewer's first eligible message | internal/store; internal/bootstrap (retained) | G; W/M/R integration |
| viewer-greetings | Eligibility is consumed without retroactive delivery | internal/store; internal/bootstrap (retained) | G; W/M/R integration |
| viewer-greetings | Recognized commands do not consume greeting eligibility | internal/store; internal/bootstrap (retained) | G; W/M/R integration |
| viewer-greetings | Canonical identity and viewer exclusion govern greetings | internal/store; internal/bootstrap (retained) | G; W/M/R integration |
| viewer-progression | Viewer level is derived from all-time XP | internal/store (retained) | G; W/M/R integration |
| viewer-progression | Levels persist like and buff session quotas | internal/store (retained) | G; W/M/R integration |
| viewer-progression | Starter social achievements | internal/store (retained) | G; W/M/R integration |
| viewer-progression | Starter on-point achievement | internal/store (retained) | G; W/M/R integration |
| viewer-progression | Achievement rules use bounded durable metrics | internal/store (retained) | G; W/M/R integration |
| viewer-progression | Achievements support one-time and repeatable unlocks | internal/store (retained) | G; W/M/R integration |
| viewer-progression | Rule changes create explicit revisions | internal/store (retained) | G; W/M/R integration |
| viewer-progression | Runtime evaluation is committed and idempotent | internal/store (retained) | G; W/M/R integration |
| viewer-progression | Administrative reconciliation is silent | internal/store (retained) | G; W/M/R integration |
| viewer-progression | Progression alert eligibility is independently controlled | internal/store (retained) | G; W/M/R integration |
| viewer-progression | Starter progression catalog is locale-aware and user-owned | internal/store (retained) | G; W/M/R integration |
| viewer-progression | Viewer merges preserve complete progression history | internal/store (retained) | G; W/M/R integration |
| viewer-progression | Live achievement unlocks carry authoritative session attribution | internal/store (retained) | G; W/M/R integration |
| viewer-progression | Upgrade attribution is conservative | internal/store (retained) | G; W/M/R integration |
| viewer-progression | Viewer merges preserve unlock sessions | internal/store (retained) | G; W/M/R integration |
| viewer-stats | Chat lines with a stable identity update durable counters | internal/store (retained) | G; W/M/R integration |
| viewer-stats | Identities stay distinct until the operator merges them | internal/store (retained) | G; W/M/R integration |
| viewer-stats | Operator can merge two viewers | internal/store (retained) | G; W/M/R integration |
| viewer-stats | Stream session and stats day are independent periods | internal/store (retained) | G; W/M/R integration |
| viewer-stats | Admin can list, search, and open a viewer | internal/store (retained) | G; W/M/R integration |
| viewer-stats | Participating stream count matches Veteran | internal/store (retained) | G; W/M/R integration |
| viewer-stats | Operator may set a canonical display name | internal/store (retained) | G; W/M/R integration |
| viewer-stats | Operator awards add score independently of chat ingest | internal/store (retained) | G; W/M/R integration |
| viewer-stats | Activity grants capped XP for regular participation | internal/store (retained) | G; W/M/R integration |
| viewer-stats | Canonical viewers expose a resolved portrait | internal/store (retained) | G; W/M/R integration |
| viewer-stats | Operator can upload and clear a custom portrait | internal/store (retained) | G; W/M/R integration |
| viewer-stats | Operator can hide a viewer from rankings | internal/store (retained) | G; W/M/R integration |
| viewer-stats | Platform avatar URLs are cached locally | internal/store (retained) | G; W/M/R integration |
| viewer-stats | Historical session aggregates remain queryable | internal/store (retained) | G; W/M/R integration |
| viewer-reward-history | Reward history exposes durable award entries | internal/store; internal/api (retained) | G; W/M/R integration |
| viewer-reward-history | Reward history is bounded and cursor-paginated | internal/store; internal/api (retained) | G; W/M/R integration |
| viewer-reward-history | Reward history can be scoped to one canonical viewer | internal/store; internal/api (retained) | G; W/M/R integration |
| viewer-reward-history | Historical award meaning survives catalog edits | internal/store; internal/api (retained) | G; W/M/R integration |
| viewer-reward-history | Reward history is not a chat archive | internal/store; internal/api (retained) | G; W/M/R integration |
| viewer-reward-history | Contract awards appear in existing reward history | internal/store; internal/api (retained) | G; W/M/R integration |
| viewer-contracts | The operator can open one viewer contract | internal/store; internal/api (retained) | G; W/M/R integration |
| viewer-contracts | The active contract is durable and readable | internal/store; internal/api (retained) | G; W/M/R integration |
| viewer-contracts | Promised reward terms are stable | internal/store; internal/api (retained) | G; W/M/R integration |
| viewer-contracts | The operator can repeat the active announcement | internal/store; internal/api (retained) | G; W/M/R integration |
| viewer-contracts | The operator can override active contract presentation | internal/store; internal/api (retained) | G; W/M/R integration |
| viewer-contracts | Winner settlement is atomic and idempotent | internal/store; internal/api (retained) | G; W/M/R integration |
| viewer-contracts | The operator can close without a result | internal/store; internal/api (retained) | G; W/M/R integration |
| viewer-contracts | Lifecycle operations are observable without exposing content | internal/store; internal/api (retained) | G; W/M/R integration |
| stream-recaps | Recap capture is manual, immutable, and session-safe | internal/store; internal/api (retained) | G; W/M/R integration |
| stream-recaps | Snapshot content is bounded and public-safe | internal/store; internal/api (retained) | G; W/M/R integration |
| stream-recaps | Recap visibility is server-authoritative but ephemeral | internal/store; internal/api (retained) | G; W/M/R integration |
| stream-recaps | Session history is durable and bounded per response | internal/store; internal/api (retained) | G; W/M/R integration |
| stream-recaps | All-time recap is live status, not a capture | internal/store; internal/api (retained) | G; W/M/R integration |
| stream-recaps | Recap presentation has one visible window | internal/store; internal/api (retained) | G; W/M/R integration |
| overlay-debugging | The global Studio test channel is isolated from live overlays | web/shared/overlay-debug.js; internal/api (retained) | G; S |
| overlay-debugging | Test scenarios exercise production rendering contracts without mutations | web/shared/overlay-debug.js; internal/api (retained) | G; S |
| overlay-debugging | Runs atomically reset and replace the global test state | web/shared/overlay-debug.js; internal/api (retained) | G; S |
| desktop-app | Desktop build embeds the local UI | cmd/comm-relay-desktop; web/shared/desktop-save.js | G; N; U (source/origin checks) |
| desktop-app | Linux installs an XDG desktop entry on first launch | cmd/comm-relay-desktop; web/shared/desktop-save.js | G; N; U (source/origin checks) |
| desktop-app | Linux webview GPU policy stays explicit | cmd/comm-relay-desktop; web/shared/desktop-save.js | G; N; U (source/origin checks) |
