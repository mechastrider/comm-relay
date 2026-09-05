# CR-023: Overlay test tools — доработка и возврат в UI

Status: `blocked`

## Goal

Закрыть техдолг по **Studio overlay test tools**: принять продуктовое решение, довести функцию до состояния, в котором оператору она понятна и безопасна, и либо вернуть UI, либо сознательно удалить мёртвый код.

## Context

Change [`openspec/changes/studio-overlay-test-tools/`](../../openspec/changes/studio-overlay-test-tools/) реализован на backend и во frontend-модулях, но:

- панель «Test overlay» **убрана из UI** (2026-09-05) до прояснения модели;
- открытый продуктовый вопрос: [OQ-002](../open-questions.md#oq-002-тестовые-сценарии-overlay--изоляция-ui-и-эфирные-источники-2026-09-05);
- в OpenSpec tasks остаются незакрытые 5.3–5.6 (P0 browser/OBS QA, full review, distribution readiness).

**Техдолг:** живые маршруты `/overlay/test/*`, `/ws/overlay-debug`, API `/api/overlay-debug/*` и JS (`overlay-debug-panel.js`, …) без операторской точки входа в Studio.

## Scope

- Решение по OQ-002 (изоляция vs эфирные overlay vs гибрид vs откат).
- При сохранении функции: восстановить или переработать UI Studio; синхронизировать `README`, `CHANGELOG`, канонические specs.
- Выполнить P0 из [`qa_plan.md`](../../openspec/changes/studio-overlay-test-tools/qa_plan.md) или сузить scope в OpenSpec.
- При откате: удалить неиспользуемые маршруты/API/модули; archive change с пометкой `wont-ship`.

## Out Of Scope

- Произвольный JSON/script injection в overlay (остаётся non-goal исходного change).
- Управление сценами OBS из CommRelay.

## Acceptance Criteria

- OQ-002 в статусе `resolved` или `wont-fix` с явной ссылкой на выбранный вариант.
- Либо оператор снова видит согласованный UX тестирования в Studio, либо мёртвый backend/UI-код удалён и задокументирован отказ.
- `go test ./...`, `npm test`, `npm run lint` зелёные; для shipping-варианта — пройден P0 из qa_plan или зафиксированы явные skips.

## Checks

- `go test ./internal/api/...`
- `npm test` и `npm run lint`
- Ручной smoke Studio + OBS по сценарию, выбранному в OQ-002

## Blocked By

- [OQ-002](../open-questions.md#oq-002-тестовые-сценарии-overlay--изоляция-ui-и-эфирные-источники-2026-09-05) — продуктовое решение по модели тестирования.

## Notes

- 2026-09-05: UI скрыт по запросу оператора; backend не трогали.
