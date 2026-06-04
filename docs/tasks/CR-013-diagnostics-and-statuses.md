# CR-013: Diagnostics And Statuses

Status: `done`

## Goal

Улучшить диагностику состояния приложения и connector.

## Context

После рабочего MVP пользователю нужно быстро понимать, какая платформа подключена, где ошибка и что можно сделать.

## Scope

- Добавить единый статус connector:
  - disabled
  - connecting
  - connected
  - reconnecting
  - error
- Показывать статусы в админке.
- Добавить последние ошибки connector без секретов.
- Добавить счетчики сообщений по платформам.
- Добавить basic runtime info:
  - uptime
  - active WebSocket clients
  - enabled connectors
- Добавить API endpoint для diagnostics.

## Out Of Scope

- Метрики Prometheus.
- История логов в UI.
- Удаленная диагностика.

## Acceptance Criteria

- Админка показывает понятный статус каждой платформы.
- Последняя ошибка connector видна без просмотра логов.
- Счетчики сообщений обновляются.
- Секреты не попадают в UI и logs.

## Checks

- `go build ./...`
- `go test ./...`
- Manual admin smoke.

## Notes For Agent

- Статусы должны быть platform-agnostic, чтобы не размазывать платформенную логику по UI.

## Completion

- `internal/connector/status`: platform map, `reconnecting`, message counters, `SanitizeError`, `RunMessageCounter`.
- Twitch connector reports live status; YouTube/VK set `reconnecting` during backoff.
- `GET /api/diagnostics` + extended `GET /api/status` (`last_error`, `message_count`).
- Admin overview polls diagnostics and shows runtime row + per-platform detail lines.
- Checks: `go build ./...`, `go test ./...` passed. Manual admin smoke not run here.
