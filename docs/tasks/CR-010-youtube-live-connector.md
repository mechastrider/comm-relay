# CR-010: YouTube Live Connector With OAuth

Status: `todo`

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
