# CR-009: Prototype Smoke Test

Status: `todo`

## Goal

Проверить первый прототип end-to-end перед использованием на стриме.

## Context

Эта задача не должна добавлять крупные функции. Она нужна, чтобы найти и исправить разрывы в потоке Twitch -> OBS overlay.

## Scope

- Запустить приложение.
- Проверить `/health`.
- Проверить `/`.
- Проверить `/overlay`.
- Проверить `/ws`.
- Подключить реальный Twitch channel.
- Убедиться, что сообщения появляются в overlay.
- Исправить найденные мелкие дефекты.
- Зафиксировать результат проверки в этом файле или в tracker notes.

## Out Of Scope

- YouTube.
- VK.
- Редизайн overlay.
- Большие архитектурные изменения.

## Acceptance Criteria

- Есть подтверждение, что Twitch-сообщения доходят до overlay.
- Overlay переживает рестарт сервера и переподключается.
- Админка сохраняет настройки.
- Все обнаруженные blockers описаны или исправлены.

## Checks

- `go build ./...`
- `go test ./...`
- Manual smoke in browser.
- OBS Browser Source smoke if OBS is available.

## Notes For Agent

- Если OBS недоступен, явно написать, что проверено только в браузере.
