# CommRelay Task Tracker

Этот файл — основной backlog проекта. Агент должен брать задачи сверху вниз и обновлять статусы здесь и в отдельном файле задачи.

## Статусы

- `todo` — задача готова к работе.
- `in_progress` — задача сейчас в работе.
- `blocked` — задача заблокирована внешним условием или решением.
- `done` — задача завершена, проверки выполнены или явно описаны.

## Правило выбора следующей задачи

1. Читать `AGENTS.md`, `docs/concept.md` и этот файл.
2. Найти первую задачу со статусом `todo`.
3. Открыть связанный файл из `docs/tasks/`.
4. Перевести задачу в `in_progress` в этом файле и в файле задачи.
5. Выполнить только эту задачу, не перескакивая к следующим.
6. После завершения перевести задачу в `done` или `blocked` и оставить краткую заметку.

## Backlog

| Order | ID | Status | Stage | Task | Task file |
|---:|---|---|---|---|---|
| 1 | CR-001 | done | Prototype | Scaffold Go app and HTTP server | [CR-001](tasks/CR-001-scaffold-go-app-and-http-server.md) |
| 2 | CR-002 | done | Prototype | Add config loading and saving | [CR-002-config-json.md](tasks/CR-002-config-json.md) |
| 3 | CR-003 | done | Prototype | Add unified chat model and event bus | [CR-003-chat-model-and-event-bus.md](tasks/CR-003-chat-model-and-event-bus.md) |
| 4 | CR-004 | done | Prototype | Add WebSocket hub and `/ws` endpoint | [CR-004-websocket-hub.md](tasks/CR-004-websocket-hub.md) |
| 5 | CR-005 | done | Prototype | Add basic OBS overlay | [CR-005-basic-obs-overlay.md](tasks/CR-005-basic-obs-overlay.md) |
| 6 | CR-006 | done | Prototype | Add basic admin UI | [CR-006-basic-admin-ui.md](tasks/CR-006-basic-admin-ui.md) |
| 7 | CR-007 | done | Prototype | Add Twitch IRC connector | [CR-007-twitch-irc-connector.md](tasks/CR-007-twitch-irc-connector.md) |
| 8 | CR-008 | done | Prototype | Wire bootstrap lifecycle and graceful shutdown | [CR-008-bootstrap-lifecycle.md](tasks/CR-008-bootstrap-lifecycle.md) |
| 9 | CR-009 | done | Prototype | Smoke test Twitch-to-OBS prototype | [CR-009-prototype-smoke-test.md](tasks/CR-009-prototype-smoke-test.md) |
| 10 | CR-010 | done | Streaming MVP | Add YouTube Live connector with OAuth | [CR-010-youtube-live-connector.md](tasks/CR-010-youtube-live-connector.md) |
| 11 | CR-011 | done | Streaming MVP | Research and add VK Live connector | [CR-011-vk-live-connector.md](tasks/CR-011-vk-live-connector.md) |
| 12 | CR-012 | done | Streaming MVP | Polish OBS overlay styling | [CR-012-overlay-styling.md](tasks/CR-012-overlay-styling.md) |
| 13 | CR-013 | done | Product polish | Improve diagnostics and connector statuses | [CR-013-diagnostics-and-statuses.md](tasks/CR-013-diagnostics-and-statuses.md) |
| 14 | CR-014 | done | Product polish | Add emoji provider research plan | [CR-014-emoji-provider-research.md](tasks/CR-014-emoji-provider-research.md) |
| 15 | CR-015 | done | Product polish | Add rich message fragments | [CR-015-rich-message-fragments.md](tasks/CR-015-rich-message-fragments.md) |
| 16 | CR-016 | done | Product polish | Add safe overlay fragment renderer | [CR-016-overlay-fragment-renderer.md](tasks/CR-016-overlay-fragment-renderer.md) |
| 17 | CR-017 | done | Product polish | Render Twitch native IRC emotes | [CR-017-twitch-native-emotes.md](tasks/CR-017-twitch-native-emotes.md) |
| 18 | CR-018 | done | Product polish | Add emote provider metadata cache | [CR-018-emote-provider-cache.md](tasks/CR-018-emote-provider-cache.md) |
| 19 | CR-019 | done | Product polish | Add FFZ and BTTV emote providers | [CR-019-ffz-bttv-emote-providers.md](tasks/CR-019-ffz-bttv-emote-providers.md) |
| 20 | CR-020 | done | Product polish | Add 7TV emote provider | [CR-020-7tv-emote-provider.md](tasks/CR-020-7tv-emote-provider.md) |
| 21 | CR-021 | done | Product polish | Add safe image link previews | [CR-021-safe-image-link-previews.md](tasks/CR-021-safe-image-link-previews.md) |
| 22 | CR-022 | done | Product polish | Add rich chat admin controls and diagnostics | [CR-022-rich-chat-admin-controls.md](tasks/CR-022-rich-chat-admin-controls.md) |
| 23 | CR-023 | done | Stream diagnostics | Add stream status foundation (model, API, admin strip) | [CR-023-stream-status-foundation.md](tasks/CR-023-stream-status-foundation.md) |

## Current Notes

- CR-023: Stream diagnostics foundation — `internal/streamstatus` snapshots + in-memory history, `GET /api/streams/status`, admin Systems strip. Chat health from connector registry; stream state stays `unknown` until platform monitors (next tasks). Viewers are JSON `null`, not `0`.
- CR-022: Added `overlay.emotes` toggles (Twitch/FFZ/BTTV/7TV) and admin Rich chat dialog for emote providers plus `overlay.image_previews` limits/allowlist. Connectors, enricher, and refresher honor toggles. `PATCH /api/config` returns structured `fields` for validation errors. Systems panel shows emote cache counts, last refresh, and provider errors from diagnostics.
- CR-021: Added `internal/imagelink` URL validation (HTTPS-only, host allowlist, private/localhost rejection, image extensions) and fragment enrichment on Twitch/YouTube/VK connectors. Config `overlay.image_previews` defaults to disabled with a conservative host list; overlay renders `image_link` fragments via DOM `<img>` with `referrerpolicy="no-referrer"` and bounded CSS. Backend never fetches user URLs.
- CR-020: Added 7TV `Fetcher` in `internal/emote/seventv` (v3 global + Twitch channel endpoints, CDN `2x.webp` URLs), periodic refresh and third-party lookup with channel 7TV before FFZ/BTTV. Provider failures keep plain chat text; cache health on `GET /api/diagnostics`.
- CR-019: Added FFZ and BTTV `Fetcher` implementations (`internal/emote/ffz`, `internal/emote/bttv`), periodic metadata refresh for active Twitch channels, third-party token matching via `emote.Enricher` in the Twitch connector (channel scopes before globals; Twitch IRC positions still win). Provider failures keep plain chat text; cache health remains on `GET /api/diagnostics`.
- CR-018: Added `internal/emote` package with `Fetcher` interface, bounded in-memory cache (TTL, eviction, refresh backoff), `Metadata.ToFragment()`, maintenance runnable, and `emote_cache` block on `GET /api/diagnostics`. Provider implementations deferred to CR-019/020.
- CR-017: Twitch connector maps IRC emote positions to `fragments` (text + emote blocks) with CDN URLs; overlapping/out-of-bounds positions omit fragments and keep plain `message`. Tests cover mixed, repeated, and malformed cases. Overlay emote renderer unchanged (CR-016).
- CR-016: Overlay renders structured `fragments` without `innerHTML`: text fragments become text nodes, emote fragments become constrained inline images with safe URL/attribute handling, and unsupported or broken image fragments fall back to text. Browser smoke verified plain, emote, and fallback rows.
- CR-015: Added `MessageFragment` model (`text`, `emote`, `image_link`) on `ChatMessage.Fragments`; `/ws` payload includes optional `fragments` while keeping plain `message` for backward compatibility. Connectors do not populate fragments yet (CR-017+).
- CR-014: Emoji/rich media research documented in `docs/emoji-provider-research.md`. Follow-up tasks added for fragments, safe overlay rendering, Twitch emotes, provider cache, FFZ/BTTV, 7TV, safe image link previews with SSRF guardrails, and admin controls.
- CR-013: Unified connector states (disabled/connecting/connected/reconnecting/error), Twitch live status via registry, per-platform message counters, `GET /api/diagnostics` (uptime, WS clients, counts), admin overview shows details/last errors/diagnostics. Manual admin smoke not run in agent environment.
- CR-012: Overlay polish — platform accent colors (Twitch/YouTube/VK), CSS variables, compact/normal layout, font size 12–32px; settings in `config.json` + admin Display panel; fade-in/out animations. Manual OBS smoke not run in agent environment.
- CR-011: VK Live connector via public WebSocket API (`api.live.vkvideo.ru`, `pubsub.live.vkvideo.ru`); read-only, no OAuth; admin channel slug + status. Documented in `docs/concept.md`. Manual live smoke not run here.
- CR-010: YouTube Live connector + OAuth (`/oauth/youtube/*`), admin UI, status registry. Redirect URI: `http://127.0.0.1:<server_port>/oauth/youtube/callback`. Manual live OAuth smoke not run here (no credentials in agent environment).
- CR-009: Prototype smoke passed (live Twitch on `xqc`, browser-equivalent WS checks). Fixes: Twitch connector watches config store (admin save without restart); overlay loads overlay settings from `/api/config` when query params omitted.
- CR-008: Bootstrap uses `runnable.Manager` for HTTP, hub, history, and Twitch; startup logs `addr` and `connectors`.
- CR-007: Twitch IRC connector uses anonymous read-only IRC; `/api/status` still reports `disconnected` until CR-013 adds live connector state.
- Первый прототип ограничивается Twitch, чтобы быстро проверить сервер, WebSocket и OBS overlay на реальном стриме.
- Стримовый MVP включает Twitch, YouTube Live и VK Live / VK Video.
- Админка, overlay и WebSocket живут на одном локальном сервере: `/`, `/overlay`, `/ws`.
