# CR-010: YouTube Live Connector With OAuth

Status: `done`

## Goal

Добавить YouTube Live connector для стримового MVP.

## Context

После Twitch-прототипа нужно добавить YouTube Live Chat API и OAuth из админки.

## Scope

- Исследовать актуальную схему YouTube Live Chat API перед реализацией.
- Добавить OAuth flow:
  - authorization URL
  - callback handler
  - token save/load
  - token refresh
- Добавить настройки YouTube в админку.
- Получать live chat id активного эфира.
- Polling сообщений с учетом API limits.
- Маппить YouTube messages в `ChatMessage`.
- Публиковать сообщения в event bus.
- Показывать статус connector в админке.

## Out Of Scope

- VK.
- Эмодзи providers.
- Хранение истории сообщений.

## Acceptance Criteria

- Пользователь может подключить YouTube через админку.
- YouTube-сообщения доходят до overlay вместе с Twitch.
- Ошибки OAuth и quota видны в статусе connector.
- OAuth tokens не логируются.

## Checks

- `go build ./...`
- `go test ./...`
- Manual OAuth smoke when credentials are available.

## Notes For Agent

- Перед реализацией проверить актуальную официальную документацию YouTube API.
- Если credentials недоступны, оставить connector testable через mocks и описать ручную проверку как blocked.

## Completion Note (2026-06-03)

- YouTube Live Chat connector polls `liveBroadcasts` (`snippet.liveChatId`) and `liveChatMessages.list`, maps to `ChatMessage`, publishes on the event bus.
- OAuth: `GET /oauth/youtube/start` and `/oauth/youtube/callback`; tokens in `config.json`; admin GET/PATCH redacts secrets.
- Admin panel: YouTube section with OAuth fields, Connect link, live status/detail from `internal/connector/status`.
- Unit tests with mocks; manual OAuth E2E requires Google Cloud credentials and an active live stream (not run in CI).
