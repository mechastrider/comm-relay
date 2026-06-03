# Chat Relay Task Tracker

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
| 10 | CR-010 | in_progress | Streaming MVP | Add YouTube Live connector with OAuth | [CR-010-youtube-live-connector.md](tasks/CR-010-youtube-live-connector.md) |
| 11 | CR-011 | todo | Streaming MVP | Research and add VK Live connector | [CR-011-vk-live-connector.md](tasks/CR-011-vk-live-connector.md) |
| 12 | CR-012 | todo | Streaming MVP | Polish OBS overlay styling | [CR-012-overlay-styling.md](tasks/CR-012-overlay-styling.md) |
| 13 | CR-013 | todo | Product polish | Improve diagnostics and connector statuses | [CR-013-diagnostics-and-statuses.md](tasks/CR-013-diagnostics-and-statuses.md) |
| 14 | CR-014 | todo | Product polish | Add emoji provider research plan | [CR-014-emoji-provider-research.md](tasks/CR-014-emoji-provider-research.md) |

## Current Notes

- CR-009: Prototype smoke passed (live Twitch on `xqc`, browser-equivalent WS checks). Fixes: Twitch connector watches config store (admin save without restart); overlay loads overlay settings from `/api/config` when query params omitted.
- CR-008: Bootstrap uses `runnable.Manager` for HTTP, hub, history, and Twitch; startup logs `addr` and `connectors`.
- CR-007: Twitch IRC connector uses anonymous read-only IRC; `/api/status` still reports `disconnected` until CR-013 adds live connector state.
- Первый прототип ограничивается Twitch, чтобы быстро проверить сервер, WebSocket и OBS overlay на реальном стриме.
- Стримовый MVP включает Twitch, YouTube Live и VK Live / VK Video.
- Админка, overlay и WebSocket живут на одном локальном сервере: `/`, `/overlay`, `/ws`.
