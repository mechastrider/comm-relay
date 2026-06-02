# CR-003: Chat Model And Event Bus

Status: `todo`

## Goal

Добавить единую модель сообщения и внутренний event bus для доставки сообщений от connector к WebSocket/overlay.

## Context

Overlay не должен знать платформенные детали. Все connector должны публиковать одинаковые события.

## Scope

- Создать пакет для chat model, например `internal/connector` или `internal/bus`, в зависимости от текущей структуры.
- Описать `ChatMessage`:
  - `ID`
  - `Platform`
  - `UserID`
  - `Username`
  - `DisplayName`
  - `Message`
  - `AvatarURL`
  - `Badges`
  - `Timestamp`
- Описать событие `ChatMessageReceived`.
- Реализовать простой in-process event bus с bounded buffer.
- Задокументировать поведение при переполнении buffer.
- Добавить unit tests для publish/subscribe и shutdown.

## Out Of Scope

- WebSocket.
- Twitch connector.
- Хранение истории сообщений.

## Acceptance Criteria

- Connector-like producer может опубликовать `ChatMessageReceived`.
- Consumer получает сообщение.
- Bus можно корректно остановить.
- Поведение slow consumer не блокирует весь процесс бесконечно.

## Checks

- `go build ./...`
- `go test ./...`

## Notes For Agent

- Keep API small.
- Не протаскивать Twitch IRC tags или YouTube-specific fields в общую модель.
