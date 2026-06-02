# CR-012: Overlay Styling

Status: `todo`

## Goal

Довести внешний вид OBS overlay до состояния, подходящего для реального стрима.

## Context

Базовый overlay нужен для прототипа, но после добавления платформ нужно настроить визуальный стиль.

## Scope

- Улучшить CSS overlay.
- Добавить стили платформ:
  - Twitch
  - YouTube
  - VK
- Настроить typography, spacing, animation.
- Добавить настройки:
  - max messages
  - message TTL
  - font size
  - compact/normal mode if useful
- Убедиться, что фон остается прозрачным.
- Проверить читабельность в OBS Browser Source.

## Out Of Scope

- BTTV/FFZ/7TV.
- Сложный theme editor.
- React/Vue/Svelte.

## Acceptance Criteria

- Overlay выглядит аккуратно на реальном stream canvas.
- Сообщения разных платформ различимы, но не ломают unified layout.
- Текст не перекрывается и не вылезает из контейнеров.
- Настройки overlay сохраняются.

## Checks

- `go build ./...`
- `go test ./...`
- Manual smoke in browser.
- OBS Browser Source smoke if OBS is available.

## Notes For Agent

- Не добавлять видимый help text в overlay.
- Приоритет: читаемость, стабильная верстка, минимум лишнего визуального шума.
