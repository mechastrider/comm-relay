# Реестр интерактивных инициатив

Статус: **живой навигационный реестр** идей, потенциальных улучшений и поставленных результатов. Последняя сверка с canonical specs: **2026-09-08**.

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

## Рекомендуемая последовательность ближайших изменений

Это рабочая навигация для следующих сессий, а не автоматическое повышение lifecycle-статуса инициатив. OpenSpec changes следует создавать **по одному**: следующий начинается после проверки и закрытия предыдущего. Для всех пяти изменений использовать проектный профиль `desktop-change`.

| Порядок | OpenSpec change | Инициативы | Граница результата | Когда начинать |
|---|---|---|---|---|
| 1 | `viewer-reward-history` | [INT-025](#int-025) | Журнал выданных наград в карточке зрителя и общий операторский список поверх уже сохраняемых interaction events; достижения остаются в [INT-012](#int-012) | Первый change: он даёт наблюдаемость следующим экспериментам |
| 2 | `viewer-contracts-experiment` | [INT-017](#int-017) | Один активный контракт, ручное объявление, выбор победителя, существующая награда и закрытие без результата | После журнала; не добавлять отдельную экономику или универсальный rules engine |
| 3 | `first-viewer-greeting` | [INT-022](#int-022) | Одно автоматическое приветствие по первому сообщению зрителя после подтверждённого начала новой session | После контрактов; широкое автоопределение границы эфира оставить в [INT-030](#int-030), если для greeting достаточно узкого guardrail |
| 4 | `viewer-ranks-and-achievements` | [INT-012](#int-012) | Звания и достижения из долговечного журнала взаимодействий с понятным отображением текущего прогресса | После журнала наград; до финальных итогов стрима |
| 5 | `end-of-stream-recap` | [INT-031](#int-031) | Ручной полноэкранный финал с session leaderboard и достижениями текущего эфира | После званий и достижений; snapshot формируется до сброса session |

Если при intake выяснится, что change выходит за указанную границу, новую функциональность следует вернуть в отдельную инициативу, а не расширять текущий proposal.

## Требуют исследования или решения

| ID | Результат | Область | Статус | Приоритет | Источник | Следующий шаг / канон |
|---|---|---|---|---|---|---|
| <a id="int-010"></a>INT-010 | Явно сохранять выбранные сообщения как моменты и идеи аудитории | Analytics | `needs_decision` | — | [Разбор интерфейса](../research/archive/2026-09-03-stream-interface-review.md) | [OQ-003](../open-questions.md#oq-003-сохранённые-моменты-чата-и-рабочая-область-аналитики-2026-09-07) |
| <a id="int-011"></a>INT-011 | Выбрать модель тестовых overlay-сценариев и вернуть операторский UI | Studio / overlay | `needs_decision` | — | Практика отладки Studio | [OQ-002](../open-questions.md#oq-002-тестовые-сценарии-overlay--изоляция-ui-и-эфирные-источники-2026-09-05), [active change](../../openspec/changes/studio-overlay-test-tools/) |
| <a id="int-016"></a>INT-016 | Поддержать несколько алиасов одной команды | Commands | `candidate` | — | Локальная сессия «Phantom Reapers 15» | Проверить UX редактирования и конфликтов триггеров |
| <a id="int-018"></a>INT-018 | Проводить прогнозы перед миссией с ручным выбором результата | Interaction model | `candidate` | — | Локальная сессия «Phantom Reapers 15» | Отделить prediction от расходуемой экономики |
| <a id="int-019"></a>INT-019 | Проводить голосования зрителей без прямого управления игрой | Interaction model | `candidate` | — | Локальная сессия «Phantom Reapers 15» | Исследовать кроссплатформенный ввод и тайминг |
| <a id="int-020"></a>INT-020 | Добавить роли и специализации зрителей поверх общего XP | Viewer progression | `candidate` | — | Локальная сессия «Phantom Reapers 15» | Сопоставить с будущими уровнями и achievements |
| <a id="int-021"></a>INT-021 | Принимать ручные внешние события, например через Stream Deck | Rules / integrations | `needs_research` | — | Локальная сессия «Phantom Reapers 15» | Исследовать безопасную локальную boundary без управления игрой |
| <a id="int-022"></a>INT-022 | Различать первое появление зрителя и первое сообщение текущего стрима | Viewer progression | `in_progress` | `next` | Локальные сессии «Phantom Reapers 15–16» | Активная поставка: [first-viewer-greeting](../../openspec/changes/first-viewer-greeting/). Canonical spec будет добавлен после sync/archive. |
| <a id="int-024"></a>INT-024 | Расширить форматы локальных alert-медиа после проверки OBS и desktop runtime | Media | `needs_research` | — | [Разбор интерфейса](../research/archive/2026-09-03-stream-interface-review.md) | Собирать реальные потребности; текущие безопасные форматы уже специфицированы |
| <a id="int-026"></a>INT-026 | Награждать зрителей за серии последовательных стримов с настраиваемыми порогами | Viewer progression | `candidate` | — | Обсуждение после стрима 2026-09-08 | Уточнить, что считается участием и что прерывает серию; сопоставить с [`Veteran`](vision.md#achievements) и [INT-012](#int-012) |
| <a id="int-027"></a>INT-027 | Начислять зрителю XP за донаты | Viewer progression / integrations | `needs_decision` | — | Локальная сессия «Phantom Reapers 16» | [OQ-004](../open-questions.md#oq-004) |
| <a id="int-028"></a>INT-028 | Запускать настроенную реакцию от имени оператора без сообщения в публичный чат | Commands / operator UX | `candidate` | — | Локальная сессия «Phantom Reapers 16» | Определить минимальную quick-action поверхность; сопоставить с внешними событиями [INT-021](#int-021) |
| <a id="int-029"></a>INT-029 | Управлять доминированием повторных наград одного зрителя в session XP | Viewer progression | `needs_decision` | — | Локальная сессия «Phantom Reapers 16» | [OQ-005](../open-questions.md#oq-005) |
| <a id="int-030"></a>INT-030 | Снижать риск переноса session XP между эфирами, если оператор забыл начать новую session | Admin / sessions | `needs_research` | — | Локальная сессия «Phantom Reapers 16» | Исследовать безопасное напоминание и доступные [сигналы состояния эфира](../research/platform-stream-diagnostics.md) |
| <a id="int-031"></a>INT-031 | Подводить итоги стрима финальным overlay с полноэкранным session leaderboard и достижениями, полученными за эфир | End-of-stream / overlay | `candidate` | `later` | Идея после «Phantom Reapers 16», 2026-09-08 | Определить ручной сценарий завершения и состав итогов; связать с [INT-008](#int-008) и [INT-012](#int-012) |

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
| <a id="int-025"></a>INT-025 | Просматривать историю полученных зрителями наград | Analytics / viewer progression | `implemented` | Обсуждение после стрима 2026-09-08 | [viewer-reward-history](../../openspec/specs/viewer-reward-history/spec.md), [admin-and-dock](../../openspec/specs/admin-and-dock/spec.md); достижения остаются в [INT-012](#int-012) |
| <a id="int-017"></a>INT-017 | Создавать зрительские контракты: Intel Request, Find Loot и похожие задачи | Interaction model | `implemented` | Локальные сессии «Phantom Reapers 15–16» | [viewer-contracts](../../openspec/specs/viewer-contracts/spec.md), [admin-and-dock](../../openspec/specs/admin-and-dock/spec.md), [overlay-alerts](../../openspec/specs/overlay-alerts/spec.md) |

## Отложено или отклонено

| ID | Результат | Область | Статус | Причина / канон |
|---|---|---|---|---|
| <a id="int-023"></a>INT-023 | Переопределять `streamer_display_name` внутри отдельного overlay-пресета | Templates / presets | `rejected` | Имя остаётся глобальным для установки; presets не переопределяют его: [config-store](../../openspec/specs/config-store/spec.md) |
