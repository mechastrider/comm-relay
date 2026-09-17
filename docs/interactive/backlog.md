# Реестр интерактивных инициатив

Статус: **живой навигационный реестр** идей, потенциальных улучшений и поставленных результатов. Последняя сверка с canonical specs: **2026-09-16**.

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

Это рабочая навигация для следующих сессий, а не автоматическое повышение lifecycle-статуса инициатив. OpenSpec changes следует создавать **по одному**: следующий начинается после проверки и закрытия предыдущего. Пакеты (скоуп, non-goals, схема, приёмка): [`../research/operator-follow-up-changes.md`](../research/operator-follow-up-changes.md). Схема — `spec-driven` или `desktop-change` по пакету, не всем подряд.

| Порядок | OpenSpec change | Схема | Инициативы | Граница результата | Когда начинать |
|---|---|---|---|---|---|
| 1 | `command-outcome-feedback` | `spec-driven` | [INT-034](#int-034) | Статус команды fired/cooldown на WS; короткий кулдаун на оверлее (default); таймер в админке и доке | Первый: эфирная боль, без миграции |
| 2 | `audience-session-count` | `spec-driven` | [INT-035](#int-035) | Колонка и карточка: число сессий с `message_count > 0` | После 1 только из‑за очереди сессий; независим по коду |
| 3 | `recap-all-time-and-share-image` | `desktop-change` | [INT-036](#int-036) | На `/overlay/recap` итоги эфира и статус за всё время; PNG для соцсетей. Сезон не входит | INT-031 уже в main |
| 4 | `command-aliases-and-typos` | `desktop-change` | [INT-016](#int-016), [INT-037](#int-037) | Алиасы каталога + Damerau ≤ 1 при trigger ≥ 4 и unique winner | После 1: оба трогают matcher |
| 5 | `admin-stream-archive` | `spec-driven` | [INT-033](#int-033) | Первоклассный архив эфиров в админке, карточка итогов каждого | Удобнее после 3 (те же итоги / PNG) |
| 6 | `recap-season-window` | `desktop-change` | [INT-032](#int-032) | Третье окно recap — сумма за сезон | После 3; сначала выбрать границу сезона |

Если при intake выяснится, что change выходит за указанную границу, новую функциональность следует вернуть в отдельную инициативу, а не расширять текущий proposal.

## Требуют исследования или решения

| ID | Результат | Область | Статус | Приоритет | Источник | Следующий шаг / канон |
|---|---|---|---|---|---|---|
| <a id="int-010"></a>INT-010 | Явно сохранять выбранные сообщения как моменты и идеи аудитории | Analytics | `needs_decision` | — | [Разбор интерфейса](../research/archive/2026-09-03-stream-interface-review.md) | [OQ-003](../open-questions.md#oq-003-сохранённые-моменты-чата-и-рабочая-область-аналитики-2026-09-07) |
| <a id="int-011"></a>INT-011 | Выбрать модель тестовых overlay-сценариев и вернуть операторский UI | Studio / overlay | `needs_decision` | — | Практика отладки Studio | [OQ-002](../open-questions.md#oq-002-тестовые-сценарии-overlay--изоляция-ui-и-эфирные-источники-2026-09-05), backend + `/overlay/test/*` в archive [`2026-09-16-studio-overlay-test-tools`](../openspec/changes/archive/2026-09-16-studio-overlay-test-tools/) |
| <a id="int-016"></a>INT-016 | Поддержать несколько алиасов одной команды | Commands | `candidate` | — | Локальная сессия «Phantom Reapers 15» | Вместе с опечатками [INT-037](#int-037) в change `command-aliases-and-typos`; [пакет 4](../research/operator-follow-up-changes.md) |
| <a id="int-018"></a>INT-018 | Проводить прогнозы перед миссией с ручным выбором результата | Interaction model | `candidate` | — | Локальная сессия «Phantom Reapers 15» | Отделить prediction от расходуемой экономики |
| <a id="int-019"></a>INT-019 | Проводить голосования зрителей без прямого управления игрой | Interaction model | `candidate` | — | Локальная сессия «Phantom Reapers 15» | Исследовать кроссплатформенный ввод и тайминг |
| <a id="int-020"></a>INT-020 | Добавить роли и специализации зрителей поверх общего XP | Viewer progression | `candidate` | — | Локальная сессия «Phantom Reapers 15» | Сопоставить с будущими уровнями и achievements |
| <a id="int-021"></a>INT-021 | Принимать ручные внешние события, например через Stream Deck | Rules / integrations | `needs_research` | — | Локальная сессия «Phantom Reapers 15» | Исследовать безопасную локальную boundary без управления игрой |
| <a id="int-024"></a>INT-024 | Расширить форматы локальных alert-медиа после проверки OBS и desktop runtime | Media | `needs_research` | — | [Разбор интерфейса](../research/archive/2026-09-03-stream-interface-review.md) | Собирать реальные потребности; текущие безопасные форматы уже специфицированы |
| <a id="int-026"></a>INT-026 | Награждать зрителей за серии последовательных стримов с настраиваемыми порогами | Viewer progression | `candidate` | — | Обсуждение после стрима 2026-09-08 | Уточнить, что считается участием и что прерывает серию; сопоставить с [`Veteran`](vision.md#achievements) и [INT-012](#int-012) |
| <a id="int-027"></a>INT-027 | Начислять зрителю XP за донаты | Viewer progression / integrations | `needs_decision` | — | Локальная сессия «Phantom Reapers 16» | [OQ-004](../open-questions.md#oq-004) |
| <a id="int-028"></a>INT-028 | Запускать настроенную реакцию от имени оператора без сообщения в публичный чат | Commands / operator UX | `candidate` | — | Локальная сессия «Phantom Reapers 16» | Определить минимальную quick-action поверхность; сопоставить с внешними событиями [INT-021](#int-021) |
| <a id="int-029"></a>INT-029 | Управлять доминированием повторных наград одного зрителя в session XP | Viewer progression | `needs_decision` | — | Локальная сессия «Phantom Reapers 16» | [OQ-005](../open-questions.md#oq-005) |
| <a id="int-030"></a>INT-030 | Снижать риск переноса session XP между эфирами, если оператор забыл начать новую session | Admin / sessions | `needs_research` | — | Локальная сессия «Phantom Reapers 16» | Исследовать безопасное напоминание и доступные [сигналы состояния эфира](../research/platform-stream-diagnostics.md) |
| <a id="int-032"></a>INT-032 | Показывать на recap-поверхности сумму за сезон отдельно от итогов одного эфира и статуса за всё время | End-of-stream / overlay | `candidate` | — | Обсуждение 2026-09-16 | Change `recap-season-window` после all-time [INT-036](#int-036). Сначала выбрать границу сезона. [Пакет 6](../research/operator-follow-up-changes.md) |
| <a id="int-033"></a>INT-033 | В админке отдельно просматривать архив эфиров и итоги каждого стрима | Admin / sessions | `candidate` | — | Обсуждение 2026-09-16 | Change `admin-stream-archive`. Компактный History уже в диалоге Recap [INT-031](#int-031); Audience → Журнал — награды [INT-025](#int-025). [Пакет 5](../research/operator-follow-up-changes.md) |
| <a id="int-037"></a>INT-037 | Принимать команду с небольшой опечаткой, если сосед уникален | Commands | `candidate` | — | Обсуждение 2026-09-16 | Вместе с алиасами [INT-016](#int-016). Damerau ≤ 1, trigger ≥ 4, unique. [Пакет 4](../research/operator-follow-up-changes.md) |

## Согласованный горизонт

| ID | Результат | Область | Статус | Приоритет | Источник | Следующий шаг / канон |
|---|---|---|---|---|---|---|
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
| <a id="int-012"></a>INT-012 | Достижения и уровни из долговечного журнала взаимодействий | Viewer progression | `implemented` | [Видение](vision.md) | [viewer-progression](../../openspec/specs/viewer-progression/spec.md), [admin-and-dock](../../openspec/specs/admin-and-dock/spec.md) |
| <a id="int-022"></a>INT-022 | Различать первое появление зрителя и первое сообщение текущего стрима | Viewer progression | `implemented` | Локальные сессии «Phantom Reapers 15–16» | [viewer-greetings](../../openspec/specs/viewer-greetings/spec.md) |
| <a id="int-031"></a>INT-031 | Подводить итоги стрима финальным overlay с session leaderboard и достижениями эфира | End-of-stream / overlay | `implemented` | Идея после «Phantom Reapers 16», 2026-09-08 | [stream-recaps](../../openspec/specs/stream-recaps/spec.md), [obs-recap](../../openspec/specs/obs-recap/spec.md), [admin-and-dock](../../openspec/specs/admin-and-dock/spec.md) |
| <a id="int-034"></a>INT-034 | Показывать, что чат-команда принята или заморожена кулдауном | Commands / overlay | `implemented` | Обсуждение 2026-09-16 | [chat-commands](../../openspec/specs/chat-commands/spec.md), [websocket-feed](../../openspec/specs/websocket-feed/spec.md), [obs-overlay](../../openspec/specs/obs-overlay/spec.md), [admin-and-dock](../../openspec/specs/admin-and-dock/spec.md); архив [`command-outcome-feedback`](../../openspec/changes/archive/2026-09-16-command-outcome-feedback/) |
| <a id="int-035"></a>INT-035 | В Audience → Зрители показывать число эфиров, в которых зритель писал сообщения | Admin / Audience | `implemented` | Обсуждение 2026-09-16 | [viewer-stats](../../openspec/specs/viewer-stats/spec.md), [admin-and-dock](../../openspec/specs/admin-and-dock/spec.md), [http-api](../../openspec/specs/http-api/spec.md); архив [`audience-session-count`](../../openspec/changes/archive/2026-09-17-audience-session-count/) |
| <a id="int-036"></a>INT-036 | На recap переключать итоги эфира и статус за всё время; выгружать картинку для соцсетей | End-of-stream / overlay | `implemented` | Обсуждение 2026-09-16 | [stream-recaps](../../openspec/specs/stream-recaps/spec.md), [obs-recap](../../openspec/specs/obs-recap/spec.md), [admin-and-dock](../../openspec/specs/admin-and-dock/spec.md), [http-api](../../openspec/specs/http-api/spec.md), [websocket-feed](../../openspec/specs/websocket-feed/spec.md); архив [`recap-all-time-and-share-image`](../../openspec/changes/archive/2026-09-17-recap-all-time-and-share-image/) |

## Отложено или отклонено

| ID | Результат | Область | Статус | Причина / канон |
|---|---|---|---|---|
| <a id="int-023"></a>INT-023 | Переопределять `streamer_display_name` внутри отдельного overlay-пресета | Templates / presets | `rejected` | Имя остаётся глобальным для установки; presets не переопределяют его: [config-store](../../openspec/specs/config-store/spec.md) |
