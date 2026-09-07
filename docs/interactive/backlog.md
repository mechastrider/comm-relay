# Реестр интерактивных инициатив

Статус: **живой навигационный реестр** идей, потенциальных улучшений и поставленных результатов. Последняя сверка с canonical specs: **2026-09-07**.

Подробные контракты реализованного поведения находятся в [`openspec/specs/`](../../openspec/specs/). Принципы ведения реестра и маршрут инициативы описаны в [`README.md`](README.md).

## Статусы

| Статус | Значение |
|---|---|
| `candidate` | Идея заслуживает внимания, но обязательств ещё нет |
| `needs_research` | Не хватает фактов или проверки осуществимости |
| `needs_decision` | Требуется выбор человека; должна быть ссылка на `OQ-NNN` |
| `planned` | Направление согласовано и находится в roadmap |
| `in_progress` | Есть активный и согласованный OpenSpec change |
| `implemented` | Результат подтверждён canonical spec |
| `parked` | Сознательно отложено без текущего обязательства |
| `rejected` | Решено не делать в указанной форме |

Приоритет ведётся отдельно: `now`, `next`, `later` или `—`. Он не выводится автоматически из порядка строк.

## Требуют исследования или решения

| ID | Результат | Область | Статус | Приоритет | Источник | Следующий шаг / канон |
|---|---|---|---|---|---|---|
| <a id="int-010"></a>INT-010 | Явно сохранять выбранные сообщения как моменты и идеи аудитории | Analytics | `needs_decision` | — | [Разбор интерфейса](../research/archive/2026-09-03-stream-interface-review.md) | [OQ-003](../open-questions.md#oq-003-сохранённые-моменты-чата-и-рабочая-область-аналитики-2026-09-07) |
| <a id="int-011"></a>INT-011 | Выбрать модель тестовых overlay-сценариев и вернуть операторский UI | Studio / overlay | `needs_decision` | — | Практика отладки Studio | [OQ-002](../open-questions.md#oq-002-тестовые-сценарии-overlay--изоляция-ui-и-эфирные-источники-2026-09-05), [active change](../../openspec/changes/studio-overlay-test-tools/) |
| <a id="int-016"></a>INT-016 | Поддержать несколько алиасов одной команды | Commands | `candidate` | — | Локальная сессия «Phantom Reapers 15» | Проверить UX редактирования и конфликтов триггеров |
| <a id="int-017"></a>INT-017 | Создавать зрительские контракты: Intel Request, Find Loot и похожие задачи | Interaction model | `candidate` | — | Локальная сессия «Phantom Reapers 15» | Проверить минимальный ручной сценарий и связь с awards |
| <a id="int-018"></a>INT-018 | Проводить прогнозы перед миссией с ручным выбором результата | Interaction model | `candidate` | — | Локальная сессия «Phantom Reapers 15» | Отделить prediction от расходуемой экономики |
| <a id="int-019"></a>INT-019 | Проводить голосования зрителей без прямого управления игрой | Interaction model | `candidate` | — | Локальная сессия «Phantom Reapers 15» | Исследовать кроссплатформенный ввод и тайминг |
| <a id="int-020"></a>INT-020 | Добавить роли и специализации зрителей поверх общего XP | Viewer progression | `candidate` | — | Локальная сессия «Phantom Reapers 15» | Сопоставить с будущими уровнями и achievements |
| <a id="int-021"></a>INT-021 | Принимать ручные внешние события, например через Stream Deck | Rules / integrations | `needs_research` | — | Локальная сессия «Phantom Reapers 15» | Исследовать безопасную локальную boundary без управления игрой |
| <a id="int-022"></a>INT-022 | Различать первое появление зрителя и первое сообщение текущего стрима | Viewer progression | `candidate` | — | Локальная сессия «Phantom Reapers 15» | Проверить шумность и связь с activity XP |
| <a id="int-024"></a>INT-024 | Расширить форматы локальных alert-медиа после проверки OBS и desktop runtime | Media | `needs_research` | — | [Разбор интерфейса](../research/archive/2026-09-03-stream-interface-review.md) | Собирать реальные потребности; текущие безопасные форматы уже специфицированы |

## Согласованный горизонт

| ID | Результат | Область | Статус | Приоритет | Источник | Следующий шаг / канон |
|---|---|---|---|---|---|---|
| <a id="int-012"></a>INT-012 | Достижения и уровни из долговечного журнала взаимодействий | Viewer progression | `planned` | `next` | [Видение](vision.md) | [Roadmap](../roadmap.md) |
| <a id="int-013"></a>INT-013 | Reward Library, Credits и надёжные redemptions | Economy / overlay | `planned` | `next` | [Видение](vision.md) | [Roadmap](../roadmap.md) |
| <a id="int-014"></a>INT-014 | Обобщить интерактивы в `Trigger → Conditions → Actions` | Rules engine | `planned` | `later` | [Видение](vision.md) | [Roadmap](../roadmap.md) |
| <a id="int-015"></a>INT-015 | Community Awards из надёжно нормализованных сигналов платформ | Connectors / awards | `planned` | `later` | [Видение](vision.md) | [Roadmap](../roadmap.md) |

## Реализовано

| ID | Результат | Область | Статус | Источник | Канон |
|---|---|---|---|---|---|
| <a id="int-001"></a>INT-001 | Улучшить Audience: сортировка, доступное открытие строки и все платформы профиля | Admin / Audience | `implemented` | [Разбор интерфейса](../research/archive/2026-09-03-stream-interface-review.md) | [admin-and-dock](../../openspec/specs/admin-and-dock/spec.md), [viewer-stats](../../openspec/specs/viewer-stats/spec.md) |
| <a id="int-002"></a>INT-002 | Обновлять Live Leaderboard и Statistics во время эфира | Admin / Live | `implemented` | [Разбор интерфейса](../research/archive/2026-09-03-stream-interface-review.md) | [admin-and-dock](../../openspec/specs/admin-and-dock/spec.md) |
| <a id="int-003"></a>INT-003 | Связать ручную награду с исходным сообщением и подсветить его | Awards / chat | `implemented` | [Разбор интерфейса](../research/archive/2026-09-03-stream-interface-review.md) | [operator-rewards](../../openspec/specs/operator-rewards/spec.md), [websocket-feed](../../openspec/specs/websocket-feed/spec.md) |
| <a id="int-004"></a>INT-004 | Дать awards приоритет в общей непрерываемой alert-очереди | Overlay alerts | `implemented` | [Разбор интерфейса](../research/archive/2026-09-03-stream-interface-review.md) | [overlay-alerts](../../openspec/specs/overlay-alerts/spec.md) |
| <a id="int-005"></a>INT-005 | Настраивать прозрачность отдельно для chat, leaderboard и alerts | Studio / overlay | `implemented` | [Разбор интерфейса](../research/archive/2026-09-03-stream-interface-review.md) | [config-store](../../openspec/specs/config-store/spec.md) |
| <a id="int-006"></a>INT-006 | Использовать имя стримера и контекстные переменные в шаблонах alert | Templates | `implemented` | [Разбор интерфейса](../research/archive/2026-09-03-stream-interface-review.md) | [config-store](../../openspec/specs/config-store/spec.md), [overlay-alerts](../../openspec/specs/overlay-alerts/spec.md) |
| <a id="int-007"></a>INT-007 | Загружать локальные изображения и звуки и выбирать layout alert | Media / alerts | `implemented` | [Разбор интерфейса](../research/archive/2026-09-03-stream-interface-review.md) | [http-api](../../openspec/specs/http-api/spec.md), [overlay-alerts](../../openspec/specs/overlay-alerts/spec.md) |
| <a id="int-008"></a>INT-008 | Автоматически показывать и скрывать leaderboard по событиям и таймеру | Leaderboard | `implemented` | Локальная сессия «Phantom Reapers 15» | [leaderboard-visibility](../../openspec/specs/leaderboard-visibility/spec.md) |
| <a id="int-009"></a>INT-009 | Начислять ограниченный activity XP и расширить редактируемый каталог contribution awards | Viewer progression | `implemented` | [Видение](vision.md) | [viewer-stats](../../openspec/specs/viewer-stats/spec.md), [operator-rewards](../../openspec/specs/operator-rewards/spec.md) |

## Отложено или отклонено

| ID | Результат | Область | Статус | Причина / канон |
|---|---|---|---|---|
| <a id="int-023"></a>INT-023 | Переопределять `streamer_display_name` внутри отдельного overlay-пресета | Templates / presets | `rejected` | Имя остаётся глобальным для установки; presets не переопределяют его: [config-store](../../openspec/specs/config-store/spec.md) |
