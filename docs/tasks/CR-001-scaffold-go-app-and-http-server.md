# CR-001: Scaffold Go App And HTTP Server

Status: `todo`

## Goal

Создать минимальный каркас приложения `chat-relay`, который запускает локальный HTTP-сервер и обслуживает базовые маршруты.

## Context

- Концепт: `docs/concept.md`
- Архитектура из `AGENTS.md`: `cmd/chat-relay/`, `internal/`, `web/`
- Один локальный порт: `localhost:17877`

## Scope

- Создать `cmd/chat-relay/main.go`.
- Добавить минимальный bootstrap-пакет, если он нужен для чистой инициализации.
- Поднять HTTP-сервер на порту из будущей конфигурации, временно можно использовать `17877`.
- Добавить маршруты:
  - `GET /` — placeholder админки.
  - `GET /overlay` — placeholder overlay.
  - `GET /health` — простой health response.
- Добавить graceful shutdown по `SIGINT` / `SIGTERM`.

## Out Of Scope

- WebSocket.
- Twitch connector.
- Реальная админка и overlay.
- Сохранение настроек.

## Acceptance Criteria

- `go run ./cmd/chat-relay` запускает сервер.
- `GET /health` возвращает успешный ответ.
- `/` и `/overlay` открываются в браузере или через HTTP client.
- Завершение процесса не оставляет зависших goroutine сервера.

## Checks

- `go build ./...`
- `go test ./...`

## Notes For Agent

- Использовать `net/http`.
- Логи через `github.com/muonsoft/clog`, если пакет уже удобно подключить на этом этапе.
- Не добавлять frontend framework.
