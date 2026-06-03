# CR-005: Basic OBS Overlay

Status: `done`

## Goal

Создать базовый OBS overlay на plain HTML/CSS/JavaScript.

## Context

Overlay открывается как Browser Source по адресу `http://localhost:17877/overlay`.

## Scope

- Создать static assets под `web/overlay`.
- Подключить route `/overlay`.
- В JS подключаться к `/ws`.
- Рендерить входящие сообщения.
- Ограничивать количество видимых сообщений.
- Добавить TTL сообщений.
- Добавить client-side reconnect с backoff.
- Обеспечить прозрачный фон.

## Out Of Scope

- Финальный visual design.
- Эмодзи providers.
- Платформенные специальные стили.

## Acceptance Criteria

- `/overlay` открывается и имеет прозрачный фон.
- Сообщения из WebSocket появляются на странице.
- Старые сообщения удаляются по лимиту и TTL.
- При рестарте сервера overlay пытается переподключиться.

## Checks

- `go build ./...`
- `go test ./...`
- Manual smoke: открыть `/overlay`, проверить прозрачный фон и появление тестового сообщения.

## Notes For Agent

- Без React/Vue/Svelte.
- Не добавлять видимый текст-инструкцию в сам overlay.

## Completion Note

2026-06-03: Added `web/overlay/overlay.js` (WebSocket client, exponential reconnect, max message cap, TTL expiry), `web/overlay/overlay.css` (transparent background, fade-in), and updated `index.html`. Configurable via query params `max_messages` and `message_ttl_seconds` (defaults 30 / 20). Extended `server_test` overlay route checks for static assets and transparent CSS.
