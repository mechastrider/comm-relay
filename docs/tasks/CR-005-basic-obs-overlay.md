# CR-005: Basic OBS Overlay

Status: `in_progress`

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
