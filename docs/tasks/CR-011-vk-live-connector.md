# CR-011: VK Live Connector

Status: `todo`

## Goal

Исследовать и добавить VK Live / VK Video connector для стримового MVP.

## Context

VK Live является обязательной платформой стримового MVP, но API-детали нужно подтвердить перед реализацией.

## Scope

- Исследовать официальный или устойчивый API для live chat VK Live / VK Video.
- Зафиксировать выбранный подход в `docs/concept.md` или отдельной заметке, если решение существенно.
- Добавить настройки VK в config и админку.
- Реализовать авторизацию, если она нужна.
- Получать сообщения текущего эфира.
- Маппить VK messages в `ChatMessage`.
- Публиковать сообщения в event bus.
- Показывать статус connector в админке.

## Out Of Scope

- Неофициальный scraping без отдельного решения.
- Эмодзи providers.
- История сообщений.

## Acceptance Criteria

- Есть задокументированное решение по API VK.
- VK-сообщения доходят до overlay вместе с Twitch и YouTube.
- Ошибки API или авторизации видны в статусе connector.
- Connector не роняет приложение при ошибках VK.

## Checks

- `go build ./...`
- `go test ./...`
- Manual smoke with VK live stream when available.

## Notes For Agent

- Если официальный API не позволяет получить live chat надежно, перевести задачу в `blocked` и описать варианты.
