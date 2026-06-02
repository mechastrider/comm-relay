# CR-014: Emoji Provider Research Plan

Status: `todo`

## Goal

Подготовить план поддержки Twitch emoji, BTTV, FFZ и 7TV без резкого роста потребления памяти.

## Context

Эмодзи не входят в первый прототип и стримовый MVP, но будут важны для качества overlay.

## Scope

- Исследовать источники emoji/emote metadata:
  - Twitch
  - BTTV
  - FFZ
  - 7TV
- Описать подход к кешированию metadata.
- Описать подход к lazy-loading изображений в overlay.
- Оценить memory budget.
- Предложить этапность реализации.
- Создать follow-up implementation tasks, если исследование завершено.

## Out Of Scope

- Полная реализация emoji providers.
- CDN proxy.
- Собственный storage картинок.

## Acceptance Criteria

- Есть документированное решение или план.
- Понятно, какие providers добавлять первыми.
- Понятно, как не раздувать память локального приложения.
- Backlog дополнен implementation tasks, если они готовы.

## Checks

- Documentation review.

## Notes For Agent

- Перед выводами проверить актуальные API providers.
- Не тащить emoji поддержку в первый прототип.
