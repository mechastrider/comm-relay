# Текущая delivery queue

Этот файл временно сохраняет незакрытую задачу старого CR-процесса. Он **не является backlog идей** и не задаёт агентам правило автоматически брать верхнюю строку.

Новые инициативы учитываются в [`interactive/backlog.md`](interactive/backlog.md). После продуктового решения готовая к разработке работа оформляется в `openspec/changes/<name>/`, а её исполняемый checklist — в `tasks.md` этого change.

## Активная legacy-задача

| ID | Status | Task | Связи |
|---|---|---|---|
| CR-023 | `blocked` | Overlay test tools — rework and UI | [Task](tasks/CR-023-overlay-test-tools-rework.md), [OQ-002](open-questions.md#oq-002-тестовые-сценарии-overlay--изоляция-ui-и-эфирные-источники-2026-09-05), archive [`2026-09-16-studio-overlay-test-tools`](../openspec/changes/archive/2026-09-16-studio-overlay-test-tools/) (backend shipped; Studio UI deferred) |

CR-023 останется `blocked`, пока человек не выберет модель тестирования overlay. Backend и dedicated test URLs уже в canonical specs; closeout recap и overlay-debug engineering — через OpenSpec archive, не через CR.

## История

Завершённые CR-001–CR-022 и подробные заметки раннего процесса сохранены в [`archive/task-tracker-mvp.md`](archive/task-tracker-mvp.md). После закрытия или отмены CR-023 этот файл можно целиком заморозить как legacy entry point.
