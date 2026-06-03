# CR-002: Config JSON

Status: `done`

## Goal

Добавить чтение и запись настроек из `config.json` для первого прототипа.

## Context

Конфигурация нужна для порта сервера, Twitch-канала и базовых настроек overlay.

## Scope

- Создать пакет `internal/config`.
- Описать структуру настроек:
  - `server_port`
  - `twitch.enabled`
  - `twitch.channel`
  - `youtube.enabled`
  - `vk.enabled`
  - `overlay.max_messages`
  - `overlay.message_ttl_seconds`
- Реализовать загрузку config-файла.
- Если файла нет, создавать конфиг с безопасными дефолтами.
- Реализовать сохранение настроек.
- Подключить `server_port` к запуску HTTP-сервера.

## Out Of Scope

- OAuth-токены.
- Шифрование секретов.
- Настройки через админку.

## Acceptance Criteria

- Приложение стартует без существующего `config.json`.
- После старта можно получить или создать config с дефолтами.
- Изменение `server_port` влияет на порт HTTP-сервера.
- Ошибки чтения и записи конфигурации логируются и возвращаются с контекстом.

## Checks

- `go build ./...`
- `go test ./...`

## Notes For Agent

- JSON-поля должны быть в `snake_case`.
- Не логировать потенциальные секреты, даже если сейчас их нет.
- Для wrapped errors использовать `github.com/muonsoft/errors`.

## Completion Note

- Added `internal/config` with load/save, validation, atomic write, and safe defaults.
- Bootstrap loads `config.json` (flag `-config`) and uses `server_port` for HTTP listen; `-addr` overrides when set.
- Unit tests cover missing file, parse, validation, and round-trip save.
