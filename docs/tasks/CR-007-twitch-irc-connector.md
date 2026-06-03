# CR-007: Twitch IRC Connector

Status: `done`

## Goal

Добавить Twitch IRC connector для первого прототипа.

## Context

Первый прототип проверяет поток сообщений Twitch -> event bus -> WebSocket -> OBS overlay.

## Scope

- Создать Twitch connector в `internal/connector/twitch` или близкой структуре.
- Использовать `go-twitch-irc`.
- Подключаться к каналу из config.
- Публиковать `ChatMessageReceived` в event bus.
- Заполнять unified `ChatMessage`.
- Добавить reconnect/backoff.
- Логировать connect/disconnect/errors.
- Не ронять весь процесс при ошибке Twitch connector.

## Out Of Scope

- EventSub.
- OAuth Twitch.
- Несколько каналов.
- Эмодзи providers.

## Acceptance Criteria

- При включенном Twitch connector сообщения канала доходят до event bus.
- Overlay получает и показывает Twitch-сообщения.
- При отключении сети connector пытается переподключиться.
- Пустой или выключенный Twitch config не запускает connector.

## Checks

- `go build ./...`
- `go test ./...`
- Manual smoke with real Twitch channel when available.

## Notes For Agent

- Для публичного чтения чата использовать anonymous или минимально необходимое подключение, если библиотека это поддерживает.
- Не логировать приватные данные.

## Completion Note

- Added `internal/connector/twitch` with anonymous IRC via `go-twitch-irc/v4`, message mapping, reconnect backoff, and bootstrap wiring when `twitch.enabled` is true.
- Unit tests cover message mapping and publish path with a fake IRC client.
- Manual smoke with a live Twitch channel was not run in the cloud agent environment.
