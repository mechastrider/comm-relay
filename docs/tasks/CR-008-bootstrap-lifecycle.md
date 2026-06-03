# CR-008: Bootstrap Lifecycle

Status: `done`

## Goal

Связать config, event bus, WebSocket hub, static routes и Twitch connector в единый lifecycle приложения.

## Context

К этому моменту части прототипа уже существуют отдельно. Нужно собрать их в один устойчивый запуск.

## Scope

- Доработать `internal/bootstrap`.
- Инициализировать config.
- Инициализировать event bus.
- Инициализировать WebSocket hub.
- Зарегистрировать API и static routes.
- Запускать Twitch connector, если он включен в config.
- Обеспечить graceful shutdown всех компонентов.
- Добавить понятные startup logs.

## Out Of Scope

- YouTube.
- VK.
- Финальная админка.

## Acceptance Criteria

- `go run ./cmd/chat-relay` запускает весь прототип.
- При `Ctrl+C` сервер и connector завершаются корректно.
- Одна ошибка connector не роняет весь процесс.
- Startup logs показывают порт и включенные connector.

## Checks

- `go build ./...`
- `go test ./...`
- `go test ./... -race` when practical.

## Notes For Agent

- Если используется `pior/runnable`, следовать skill `runnable-background-processes`.
- Keep wiring explicit.

## Completion

- `internal/bootstrap/run.go` uses `runnable.Manager`: HTTP + Twitch as processes; WebSocket hub and message history as services; SIGINT/SIGTERM via `runnable.Run`.
- Startup log includes listen `addr` and enabled `connectors` (e.g. `twitch` or `none`).
- Event bus closes after manager shutdown.
