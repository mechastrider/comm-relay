# Текущая delivery queue

Этот файл временно сохраняет незакрытую задачу старого CR-процесса. Он **не является backlog идей** и не задаёт агентам правило автоматически брать верхнюю строку.

Новые инициативы учитываются в [`interactive/backlog.md`](interactive/backlog.md). После продуктового решения готовая к разработке работа оформляется в `openspec/changes/<name>/`, а её исполняемый checklist — в `tasks.md` этого change.

## Активная legacy-задача

| ID | Status | Task | Связи |
|---|---|---|---|
| CR-023 | `blocked` | Overlay test tools — rework and UI | [Task](tasks/CR-023-overlay-test-tools-rework.md), [OQ-002](open-questions.md#oq-002-тестовые-сценарии-overlay--изоляция-ui-и-эфирные-источники-2026-09-05), [OpenSpec change](../openspec/changes/studio-overlay-test-tools/) |

CR-023 останется `blocked`, пока человек не выберет модель тестирования overlay. Реализовывать один из вариантов из OQ-002 без такого решения нельзя.

## История

Завершённые CR-001–CR-022 и подробные заметки раннего процесса сохранены в [`archive/task-tracker-mvp.md`](archive/task-tracker-mvp.md). После закрытия или отмены CR-023 этот файл можно целиком заморозить как legacy entry point.
