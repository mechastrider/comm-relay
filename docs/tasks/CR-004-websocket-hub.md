# CR-004: WebSocket Hub

Status: `todo`

## Goal

Добавить WebSocket endpoint `/ws`, который рассылает сообщения overlay-клиентам.

## Context

OBS overlay будет подключаться к `ws://localhost:17877/ws` и получать unified chat messages.

## Scope

- Добавить пакет `internal/api` или соответствующий handler-пакет.
- Подключить `gorilla/websocket`.
- Реализовать WebSocket hub:
  - регистрация клиента
  - удаление клиента
  - broadcast сообщений
  - bounded outgoing buffer на клиента
- Преобразовать `ChatMessageReceived` в JSON wire format.
- Добавить `/ws` route к HTTP-серверу.
- Добавить tests для handler/hub там, где это практично.

## Out Of Scope

- Overlay UI.
- Twitch connector.
- Авторизация WebSocket.

## Acceptance Criteria

- Клиент может подключиться к `/ws`.
- При публикации chat event клиент получает JSON-сообщение.
- Slow client не блокирует всех остальных.
- Закрытие клиента корректно очищает ресурсы.

## Checks

- `go build ./...`
- `go test ./...`

## Notes For Agent

- JSON должен использовать `snake_case`.
- Минимальный формат должен оставаться совместимым с `docs/concept.md`.
