# CR-006: Basic Admin UI

Status: `todo`

## Goal

Добавить минимальную админку для первого Twitch-прототипа.

## Context

Админка открывается на `http://localhost:17877/` и нужна, чтобы не править config руками.

## Scope

- Создать static assets под `web/admin`.
- Отображать:
  - поле Twitch channel
  - toggle `twitch.enabled`
  - статус Twitch connector
  - последние сообщения
  - базовые overlay settings
- Добавить HTTP API для чтения и сохранения настроек.
- Использовать `snake_case` JSON.
- Добавить базовую валидацию входных данных.

## Out Of Scope

- YouTube OAuth.
- VK настройки.
- Сложный дизайн.
- Авторизация админки.

## Acceptance Criteria

- `/` открывает админку.
- Пользователь может изменить Twitch channel и сохранить настройки.
- После сохранения настройки попадают в `config.json`.
- Ошибки API показываются пользователю в админке.

## Checks

- `go build ./...`
- `go test ./...`
- Manual smoke: открыть `/`, изменить настройки, обновить страницу.

## Notes For Agent

- Plain HTML/CSS/JS only.
- Для API routes следовать `api-conventions`.
