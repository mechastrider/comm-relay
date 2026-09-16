# Пакеты следующих OpenSpec changes

Статус: **рабочая очередь на 2026-09-16**, не roadmap и не спецификация.

Источник: обсуждение оператора (explore). Реестр: [`../interactive/backlog.md`](../interactive/backlog.md). Канон текущего поведения: [`../../openspec/specs/`](../../openspec/specs/).

OpenSpec change создавать **по одному**. Этот файл — handoff для новой сессии: `openspec-propose` (или `work-intake` → propose), затем apply. Не открывать каталог `openspec/changes/` заранее для всей очереди.

Как стартовать сессию:

```text
1. Прочитать пакет ниже целиком.
2. openspec new change "<kebab-name>" --schema "<schema>"
3. Собрать proposal / specs / design / tasks (для desktop-change — остальные артефакты; N/A где схема требует).
4. Не расширять границу пакета. Лишнее — отдельная инициатива.
```

---

## Очередь

| # | Change | Schema | INT | Зависит от |
|---|---|---|---|---|
| 1 | `command-outcome-feedback` | `spec-driven` | [INT-034](../interactive/backlog.md#int-034) | — |
| 2 | `audience-session-count` | `spec-driven` | [INT-035](../interactive/backlog.md#int-035) | — (после 1 только из‑за очереди сессий) |
| 3 | `recap-all-time-and-share-image` | `desktop-change` | [INT-036](../interactive/backlog.md#int-036) | [INT-031](../interactive/backlog.md#int-031) уже в main |
| 4 | `command-aliases-and-typos` | `desktop-change` | [INT-016](../interactive/backlog.md#int-016), [INT-037](../interactive/backlog.md#int-037) | лучше после 1: оба трогают matcher / `is_command` |
| 5 | `admin-stream-archive` | `spec-driven` | [INT-033](../interactive/backlog.md#int-033) | удобнее после 3, если архив умеет те же итоги и PNG |
| 6 | `recap-season-window` | `desktop-change` | [INT-032](../interactive/backlog.md#int-032) | после 3; сначала выбрать границу сезона |

---

## 1. `command-outcome-feedback`

**Schema:** `spec-driven`  
**INT:** [INT-034](../interactive/backlog.md#int-034)  
**Зачем:** зритель и оператор не видят, почему `!gg` не дал алерт. Кулдаун глушится в ingest (`TryFire` → Debug-лог). Клиенты уже ставят `is_command` по `Lookup`, без статуса.

**В скоупе**

- Сервер один раз решает `fired` / `cooldown` и сообщает клиентам (отдельный WS-кадр `command_outcome` с `message_platform`, `message_id`, `trigger`, `status`, `cooldown_remaining_ms`). Не вызывать `TryFire` в Hub и ingest одновременно.
- Overlay чат: замороженная строка **без таймера**, короткая видимость (~5 с, константа, не слайдер Studio).
- Новая опция рядом с `hide_command_messages`: кулдаун на оверлее **показывать коротко** (default) или **скрыть**.
- `hide_command_messages` прячет **успешные** команды; при «показывать коротко» замороженные строки на оверлее всё равно мелькают.
- Admin и dock: подсветка принято / заморожено; **countdown только здесь**. После F5, пока процесс жив, статус можно восстановить из in-memory map.
- `show_leaderboard` без splash тоже получает «принято» в админке/доке.

**Вне скоупа**

- Алиасы и опечатки (пакет 4).
- Ответ в Twitch/YouTube чат.
- Персист кулдауна в SQLite.
- Таймер на `/overlay`.

**Спеки:** `chat-commands`, `websocket-feed`, `obs-overlay`, `admin-and-dock`, `config-store`.  
**Код:** `internal/command/matcher.go`, `internal/api/viewer_ingest.go`, `internal/api/ws_hub.go`, `web/overlay/overlay.js` (паттерн `reward-highlight`), `web/dock/messages.js`, Live messages, Settings checkbox.

**Приёмка**

- Два `!gg` внутри кулдауна: один алерт; вторая строка на оверлее ~5 с «лёд»; в админке/доке ⏳ и тикающие секунды.
- Default: оверлей показывает кулдаун даже при скрытых командах.
- Опция «скрыть»: на оверлее кулдаун не появляется.
- Процесс рестарт: кулдаун сбрасывается (как сейчас).

---

## 2. `audience-session-count`

**Schema:** `spec-driven`  
**INT:** INT-035  
**Зачем:** на Audience → Зрители не видно, в скольких эфирах человек писал. Метрика уже есть у достижения Veteran.

**В скоупе**

- `GET /api/viewers` и `GET /api/viewers/get` отдают `session_count`.
- SQL как у progression: `COUNT(*) FROM viewer_session_stats WHERE viewer_id = ? AND message_count > 0`.
- Колонка «Эфиры», сортировка, строка в карточке. Не зависит от фильтра session/day/all.

**Вне скоупа**

- Считать эфир по XP без сообщений.
- Денормализация `viewers.session_count`.
- Overlay / recap.

**Спеки:** `viewer-stats`, `admin-and-dock`, `http-api`.  
**Код:** `internal/store/query.go`, `internal/store/progression.go` (тот же запрос), `web/admin/js/viewers.js`, `audience-helpers.js`, `index.html` colgroup.

**Приёмка**

- Зритель с сообщениями в 3 сессиях → `3`.
- Только награда, 0 сообщений → `0`.
- Merge складывает сессии по тем же правилам, что Veteran.

---

## 3. `recap-all-time-and-share-image`

**Schema:** `desktop-change` (`platform_contract` — download/clipboard; `persistence_schema` / `distribution_plan` скорее N/A)  
**INT:** INT-036  
**Зачем:** итоги эфира уже фиксируются; отдельно нужен **статус за всё время** на той же `/overlay/recap` и PNG для соцсетей.

**В скоупе**

- Переключатель представления: **итоги эфира** (иммутабельный снимок, логика INT-031 без изменений) / **за всё время**.
- All-time — **статус**, не capture. Show all-time не вызывает «Зафиксировать». Unique viewers = зрители с `message_count > 0`; XP/сообщения = поля `viewers`; топ-5 как лидерборд `period=all`. Ленту ачивок эфира в all-time не тащить.
- Пока recap-источник видим, оператор может переключить окно без New stream.
- Кнопка «Скачать картинку» в диалоге Recap: непрозрачная share-card того окна, которое сейчас показано (16:9; квадрат — если дёшево). Рендер из данных, не скрин прозрачного OBS.

**Вне скоупа**

- Сезон / месяц / кампания → INT-032.
- Живой all-time, вшитый в session snapshot.
- html2canvas поверх прозрачного Browser Source.
- Показ чужого исторического снимка на эфире → INT-033.

**Спеки:** `stream-recaps`, `obs-recap`, `admin-and-dock`, `http-api`, `websocket-feed`, при необходимости `obs-leaderboard` (только переиспользование period=all).  
**Код:** `internal/recap/`, `web/recap/`, `web/admin/js/live-recap.js`.

**Приёмка**

- После фиксации эфира переключение на «всё время» не меняет сохранённый snapshot.
- Show all-time без prior capture не создаёт recap row.
- PNG скачивается локально, фон непрозрачный.

**N/A в desktop-change:** нет новой SQLite-схемы, нет installer/signing. Зафиксировать явно.

---

## 4. `command-aliases-and-typos`

**Schema:** `desktop-change` (миграция каталога = `persistence_schema`)  
**INT:** INT-016 (алиасы) + INT-037 (опечатки)  
**Зачем:** `!heate` сейчас обычный чат. Оператор хотел A+B: явные алиасы и узкий fuzzy.

**В скоупе**

- Несколько trigger-алиасов на одну команду; уникальность среди всех enabled triggers+aliases; UX редактора и конфликты.
- Damerau-Levenshtein ≤ 1 только если: целая bang-строка без пробелов; канонический trigger **≥ 4** символов; ровно один победитель. Иначе не стрелять.
- Кулдаун, `is_command`, interaction event — по **каноническому** command id.
- Короткие сиды `gg` / `hi` fuzzy не ловят.

**Вне скоупа**

- «Did you mean» без выстрела как единственная модель.
- Fuzzy по `!heat please`, транслит, фонетика, соседние клавиши.
- Параметризованные команды.

**Спеки:** `chat-commands`, `http-api`, `admin-and-dock`, packimport если YAML каталога есть.  
**Код:** `internal/command/matcher.go` (`ParseLine` / `Lookup`), `internal/store/commands.go`, миграция, `web/admin/js/commands-catalog.js`.

**Приёмка**

- Алиас `heate` на `heat` → алерт `heat`.
- Без алиаса `!heate` → `heat`, если нет другого соседа на dist 1.
- `!gg` / `!go` не алиасятся fuzzy.
- Два триггера на dist 1 от ввода → обычный чат.

Делать **после** пакета 1, чтобы outcome-кадр описывал канонический trigger.

---

## 5. `admin-stream-archive`

**Schema:** `spec-driven`  
**INT:** INT-033  
**Зачем:** история эфиров спрятана в Recap → History. Нужна первоклассная админ-поверхность: список стримов и итоги каждого.

**В скоупе**

- Отдельный список сессий в админке (не вкладка «Журнал» — это награды INT-025).
- Карточка: агрегаты, топ, зафиксированный recap если есть; сессии без снимка тоже открываются.
- Данные уже есть: `GET /api/sessions`, session detail.

**Вне скоупа**

- Replay исторического recap на OBS (в INT-031 запрещён; решать явно, если понадобится).
- Сезоны.
- Обязательный PNG; может переиспользовать пакет 3, если тот уже в main.

**Спеки:** `admin-and-dock`, `stream-recaps`, `http-api`.  
**Код:** `web/admin/js/live-recap.js` (не копировать логику в третий клиент без нужды), Audience или Live IA.

**Приёмка:** оператор открывает прошлый эфир без кнопки Recap и видит те же агрегаты, что в History-диалоге.

---

## 6. `recap-season-window`

**Schema:** `desktop-change`  
**INT:** INT-032  
**Блокер:** выбрать границу сезона до proposal. Не начинать, пока не выбран один вариант.

Варианты границы:

1. календарный месяц (TZ оператора, `started_at` сессии);
2. ручной «Новый сезон» (как New stream, без сброса XP);
3. последние N эфиров.

**В скоупе (когда граница выбрана):** третье окно на `/overlay/recap` рядом с итогами эфира и all-time; unique viewers = `COUNT DISTINCT` по сессиям с `message_count > 0`; Show сезона не фиксирует session recap.

**Вне скоупа:** использовать stats `day` как сезон; вшивать сезон в иммутабельный snapshot эфира.

**Спеки:** те же, что пакет 3, плюс возможно `viewer-stats`. Сопоставить с сериями INT-026.

---

## Явно не в этой очереди

- Скрывать успешные команды на оверлее — уже `hide_command_messages`; пакет 1 только уточняет кулдаун.
- Взаимные команды, избранные сообщения, замена «контрактов» на «задания» — другие строки `var/relay_todos.md` / backlog.
- INT-013…015 (Credits, rules engine) остаются в roadmap, не в этой очереди.
