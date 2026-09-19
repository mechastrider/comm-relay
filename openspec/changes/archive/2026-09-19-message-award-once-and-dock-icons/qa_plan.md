# QA Plan

## Platform Matrix

| OS/version | Architecture | Theme/scaling/input | Required |
|------------|--------------|---------------------|----------|
| Headless Go server | CI host | HTTP fixtures | yes — CI gate |
| Current Chromium-family browser | host | Live Messages ~1280×800; dock ~400×700 | yes — UI/P0 |
| `/dock/messages` | host | height-capped OBS dock | yes — P0 icons + status |
| Live Messages | host | labeled Reward/Delete | yes — P0 uniqueness + check/snowflake |
| Overlay `/overlay` | host | transparent background | yes — P0 regression |
| OBS Browser Source | host when available | unchanged | skip unless already running |
| Packaged desktop | release runners | unchanged packaging | skip |

## Behavior and UI Scenarios

| Spec/UI/platform ref | Steps/check | Expected | P0/P1 |
|----------------------|-------------|----------|-------|
| operator-rewards / repeat like | Grant Like twice on one message id | First +5 XP/alert; second HTTP 409; no second event | P0 |
| operator-rewards / joke then advice | Grant Joke then Advice on same id | Both succeed; XP +10 then +25 | P0 |
| operator-rewards / no message id | Grant same type twice without `message_id` | Both succeed | P0 |
| operator-rewards / two clients | Live and dock grant same type together | One 200, one 409 | P0 |
| http-api / recent ids | Grant like, GET recent | `granted_award_ids` `["like"]` | P0 |
| http-api / omit empty | Ordinary chat recent | no `granted_award_ids` | P0 |
| admin-and-dock / dock icons | Open `/dock/messages` identified row | Like, medal, trash 28×28; tooltips; no НАГРАДА/УДАЛИТЬ text | P0 |
| admin-and-dock / Live labels | Same row in Live | Text Reward/Delete; Like icon | P0 |
| admin-and-dock / accepted check | Fire `!gg` | Checkmark; no “Команда принята” chip | P0 |
| admin-and-dock / frozen snowflake | Second `!gg` in cooldown | Snowflake + ticking seconds | P0 |
| admin-and-dock / rejected | Ambiguous `!like` | Snowflake + уточни | P0 |
| admin-and-dock / dim like | Grant Like, stay on row | Like inactive; Reward still opens; picker Joke choosable | P0 |
| admin-and-dock / 409 copy | Click Like after another client granted | Already-granted copy, not grant-failed | P0 |
| admin-and-dock / reload | Reload dock after Like | Like still inactive from recent GET | P0 |
| admin-and-dock / no wrap | Grant then inspect row | Actions stay on username line | P0 |
| admin-and-dock / a11y | Tab + accessible names | Icons named; status not a button | P1 |
| overlay regression | Grant while overlay loaded | Transparent page; highlight if row visible | P0 |

## Filesystem / IPC / Permission / Lifecycle Scenarios

- No new files outside `comm-relay.db`.
- Process restart: `granted_award_ids` still restored from SQLite; in-memory command outcomes clear.
- Two tabs share uniqueness via the database.

## Persistence Migration / Corruption / Recovery

- No Goose schema. Historical duplicate events remain; new grants of that triple 409.
- Failed grant transaction: no XP and no extra event.

## Install / Upgrade / Downgrade / Packaged-App Smoke

Skip installer/signing. `go build ./...`. Rollback: previous binary; duplicates allowed again; dock labels return.

## Automated Commands / Manual Setup / Fixtures

```bash
go build ./...
go test ./...
go test ./internal/store ./internal/api -race
golangci-lint run ./...
npm ci
npm run lint
```

Store/API tests for uniqueness and recent `granted_award_ids`. Node tests for reward-picker granted state, dock icon markup, command-outcome check/snowflake. Manual: `task web:dev` or `go run ./cmd/comm-relay-server`, open `/dock/messages` (~400px) and Live, compare to `docs/mockups/dock-message-row-icons.html`.

## Evidence and Explicit Skips

- Record CI command output and a dock screenshot of icon cluster + check/snowflake rows.
- Skip OBS packaging, signing, Stream Deck, and OQ-005 session XP caps.
