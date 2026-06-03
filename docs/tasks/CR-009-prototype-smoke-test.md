# CR-009: Prototype Smoke Test

Status: `done`

## Goal

Проверить первый прототип end-to-end перед использованием на стриме.

## Context

Эта задача не должна добавлять крупные функции. Она нужна, чтобы найти и исправить разрывы в потоке Twitch -> OBS overlay.

## Scope

- Запустить приложение.
- Проверить `/health`.
- Проверить `/`.
- Проверить `/overlay`.
- Проверить `/ws`.
- Подключить реальный Twitch channel.
- Убедиться, что сообщения появляются в overlay.
- Исправить найденные мелкие дефекты.
- Зафиксировать результат проверки в этом файле или в tracker notes.

## Out Of Scope

- YouTube.
- VK.
- Редизайн overlay.
- Большие архитектурные изменения.

## Acceptance Criteria

- Есть подтверждение, что Twitch-сообщения доходят до overlay.
- Overlay переживает рестарт сервера и переподключается.
- Админка сохраняет настройки.
- Все обнаруженные blockers описаны или исправлены.

## Checks

- `go build ./...`
- `go test ./...`
- Manual smoke in browser.
- OBS Browser Source smoke if OBS is available.

## Notes For Agent

- Если OBS недоступен, явно написать, что проверено только в браузере.

## Completion (2026-06-03)

### Smoke results

| Check | Result |
|-------|--------|
| `GET /health` | `{"status":"ok"}` |
| `GET /` (admin) | 200, config load/save via `PATCH /api/config` |
| `GET /overlay` | 200, `background: transparent` in CSS |
| `GET /ws` | WebSocket upgrade; live frames from Twitch IRC |
| Live Twitch (`xqc`) | Messages on `/ws` and `GET /api/messages/recent` within seconds of IRC connect |
| Admin save without restart | Fixed: connector now reads `config.Store` (poll when disabled) |
| Overlay uses saved overlay settings | Fixed: `overlay.js` loads `/api/config` (URL query params still override) |
| OBS | Not available in Cloud Agent VM — verified in browser/CLI only |
| Overlay reconnect after server restart | Client uses exponential backoff (`overlay.js`); not re-tested in OBS |

### Defects fixed

1. **Twitch connector ignored admin saves** — connector only used startup config; enabling Twitch in admin required process restart. Now watches `config.Store` and reconnects when settings change.
2. **Overlay ignored `config.json` overlay section** — OBS URL had to include `?max_messages=` manually. Overlay now applies server overlay settings unless overridden by query string.

### Automated coverage

- `internal/api/prototype_smoke_test.go` — bus → WebSocket + recent messages API.
- `internal/connector/twitch/connector_store_test.go` — enable Twitch via store update without restart.

### Follow-ups (not blockers)

- `/api/status` still reports `disconnected` for Twitch until CR-013.
- Official `twitch` channel was quiet during smoke; `xqc` used for live verification.
