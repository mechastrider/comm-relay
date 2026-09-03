# Направление рефакторинга frontend

Статус: **архитектурная рекомендация**, не спецификация и не план реализации.

Цель документа — зафиксировать границы и безопасную последовательность развития frontend после завершения стримового MVP. Решение не меняет текущий продуктовый контракт: перед реализацией каждый самостоятельный срез оформляется отдельным OpenSpec change.

## Краткий вывод

CommRelay не нужен одномоментный переход всего frontend на React, Vue или другой фреймворк. Однако админка уже достигла масштаба, при котором компонентная модель, декларативный rendering и явное владение состоянием окупят стоимость нового build pipeline.

Рекомендуемое направление:

- постепенно перевести только `web/admin` на **Vue 3 + TypeScript + Vite**;
- выбирать React вместо Vue, если практический опыт сопровождающих проект разработчиков в React заметно выше;
- оставить `/overlay`, `/overlay/leaderboard`, `/overlay/alert` и `/dock/messages` на нативных ES modules;
- сохранить `web/shared` и общие overlay-настройки независимыми от UI-фреймворка;
- не начинать миграцию до зелёного frontend test baseline и поведенческих characterization tests.

## Почему решение пора пересмотреть

Отказ от React/Vue/Svelte был ограничением этапа MVP, а не бессрочным архитектурным запретом. MVP завершён, а следующие фазы roadmap добавляют достижения, Reward Library, redemptions и rules engine — то есть новые каталоги, редакторы, состояния выполнения и связи между рабочими областями.

Срез текущей админки на момент этой заметки:

| Сигнал | Наблюдение |
|---|---|
| Production JavaScript | около 13 090 строк в 51 файле `web/admin` |
| Статическая разметка | около 1 927 строк в `web/admin/index.html` |
| DOM registry | около 295 экспортируемых ссылок в `web/admin/js/dom.js` |
| События | около 224 ручных `addEventListener` в admin-коде |
| Крупные модули | `overlay-appearance.js` — около 1 392 строк; `settings-workspace.js` — около 1 049 |
| Неявная реактивность | глобальный `state`, module-local state, Custom Events и ручные `init*` / `render*` lifecycle |

Проблема не в числе строк само по себе. Основная цена возникает из-за неясного владения состоянием и DOM:

- `dom.js` связывает большинство feature-модулей с полной разметкой страницы;
- `i18n-ui.js` импортирует feature-renderer'ы, которые импортируют i18n обратно;
- Studio, Settings и overlay preview обмениваются изменениями через прямые импорты и DOM events;
- `commands-catalog.js` и `awards-catalog.js` содержат почти одинаковые state machine, loading/save/delete lifecycle и keyboard navigation;
- значительная часть тестов проверяет pure helpers или текст HTML/CSS/JS, но не исполняет критические browser interactions.

Перенос тех же границ во Vue или React только переименует сложность. Поэтому миграция должна одновременно вводить component ownership, явные зависимости и тестируемые границы.

## Целевая граница

```text
Go HTTP/API/WebSocket
          │
          ▼
framework-neutral client modules
(API contracts, i18n catalog, chat rendering,
 overlay settings, transport helpers)
          │
          ├──────────────► Vue admin application
          │                (workspaces, forms, editors)
          │
          └──────────────► native ES module runtimes
                           (chat, leaderboard, alert, dock)
```

| Поверхность | Рекомендация | Причина |
|---|---|---|
| Admin `/` | Vue 3 + TypeScript + Vite, поэтапно | Много связанного UI-состояния, форм, редакторов и lifecycle |
| Chat overlay | Оставить vanilla ES modules | Ограниченный DOM, WebSocket, TTL и анимации важнее component tree |
| Leaderboard overlay | Оставить vanilla ES modules | Небольшой изолированный runtime с одним корнем |
| Alert overlay | Оставить vanilla ES modules | Очередь, таймеры, звук и прозрачность не упрощаются UI-фреймворком |
| OBS dock | Оставить vanilla ES modules | Независимая операторская лента с ограниченным DOM |
| `web/shared` и overlay settings | Framework-neutral JS/TS | Их совместно используют admin, dock и эфирные поверхности |
| Wails startup frontend | Не переносить в admin-фреймворк | Это стартовая заглушка; реальная админка загружается с локального Go-сервера |

## Почему Vue, а не обязательный React

Vue лучше соответствует текущей template/form-heavy админке и допускает постепенное подключение к существующей странице. Single-File Components, реактивные forms и scoped component ownership устраняют значительную часть ручного DOM wiring.

React остаётся полноценным вариантом, если его лучше знает сопровождающая проект команда. Опыт и способность поддерживать единый стиль важнее небольшой разницы в техническом соответствии. В обоих случаях нужны TypeScript, локальная production-сборка и те же архитектурные границы.

Не рекомендуются:

- **Next/Nuxt** — CommRelay не нужны SSR, серверный JavaScript или full-stack routing;
- **Alpine/petite-vue** — они сократят локальный boilerplate, но не дадут достаточной модели для Studio и будущего rules engine;
- **Lit как основной application framework** — полезен для отдельных Web Components, но не решает общую orchestration/state проблему админки.

## Обязательные предпосылки

### 1. Зелёный frontend baseline

До архитектурной миграции необходимо:

1. Сделать `npm test` стабильно зелёным на поддерживаемых платформах и переводах строк.
2. Добавить `npm test` в CI рядом с `npm run lint`.
3. Сохранить i18n parity check.
4. Добавить browser/DOM characterization tests для:
   - Settings save/reset/discard;
   - Studio draft/publish/use-on-stream;
   - Commands/Awards CRUD и keyboard/focus поведения;
   - WebSocket reconciliation в Live;
   - смены языка и восстановления состояния.

Статические regex-проверки разметки остаются полезными контрактными тестами, но не заменяют исполнение взаимодействий.

### 2. Framework-neutral seams

Перед первым Vue/React-компонентом следует:

- сделать i18n leaf-зависимостью, которая не импортирует feature-renderer'ы;
- отделить API client и wire DTO от DOM;
- сохранить chat renderer, reward picker и overlay settings доступными обычным ES modules;
- определить владельца WebSocket connection и способ доставки событий в workspace;
- запретить framework-specific imports из OBS runtime и `web/shared`.

### 3. Browser target

Production build должен явно поддерживать:

- OBS CEF на Windows;
- WebView2 в Windows desktop;
- WebKitGTK 4.1 в Linux desktop;
- актуальный Chromium-family browser для headless разработки.

Нельзя полагаться только на default target bundler'а. Prototype build проверяется хотя бы в OBS CEF и desktop WebView до расширения миграции.

## Рекомендуемая последовательность

### Этап 0 — стабилизация

- восстановить зелёные frontend tests и включить их в CI;
- добавить characterization tests критических admin flows;
- разорвать цикл i18n/rendering;
- описать framework-neutral границы shared-кода.

Этот этап полезен независимо от окончательного выбора Vue или React.

### Этап 1 — build foundation

- добавить TypeScript и Vite для admin-only source tree;
- производить детерминированный набор статических admin assets;
- запускать frontend build перед `go build` и `wails build` в CI/release;
- встроить production output через Go `embed.FS`;
- сохранить быстрый development loop с локальным Go API и frontend watcher/dev server;
- не использовать CDN: релиз должен оставаться полностью локальным и offline-ready.

Build pipeline относится к Go-обслуживаемой админке, а не к `cmd/comm-relay-desktop/frontend`: Wails frontend сейчас только показывает стартовую страницу и затем переходит на локальный admin URL.

### Этап 2 — ограниченный пилот

Первый срез — каталоги Commands и Awards в Audience:

- у них почти одинаковый list/editor CRUD lifecycle;
- из них можно выделить общие list, editor shell, async state, validation и delete-confirmation components;
- граница достаточно самостоятельна и проверяет forms, accessibility, API calls и i18n;
- vanilla-код не должен одновременно владеть DOM внутри Vue mount root.

Пилот считается успешным, если уменьшает дублирование и количество ручного wiring, не вводя глобальный store для локального состояния.

### Этап 3 — миграция рабочими областями

После пилота переносить законченные области, а не отдельные случайные controls:

1. Audience;
2. Studio;
3. Settings;
4. Live;
5. About и общий shell/router.

Studio переносится только после characterization tests dirty draft, Publish, navigation guard, preview refresh и focus restoration. Общий store вводится лишь для состояния, которое действительно разделяют несколько workspaces: config snapshot, locale, connection status и server events. Локальные формы и диалоги остаются внутри компонентов.

### Этап 4 — консолидация

- удалить больше не используемые DOM registry entries, Custom Events и старые controllers;
- оставить один composition root;
- запретить двусторонние зависимости между infrastructure и feature UI;
- проверить, что native OBS surfaces не получили framework runtime транзитивно;
- обновить developer docs и release gates после завершения миграции.

## Ограничения build и поставки

Переход не должен менять эксплуатационную модель CommRelay:

- пользователь по-прежнему получает один executable и не устанавливает Node;
- frontend build выполняется только разработчиками и CI;
- Go binary содержит согласованный набор backend и frontend assets;
- release pipeline не может встроить отсутствующий или устаревший `dist`;
- `/`, `/overlay`, `/overlay/leaderboard`, `/overlay/alert`, `/dock/messages` и `/shared/*` сохраняют текущие URL;
- development override `-web ./web` либо сохраняется, либо получает документированный эквивалент с тем же быстрым feedback loop;
- никакие production assets не загружаются с внешнего CDN.

## Критерии завершения программы

Миграция считается законченной не тогда, когда удалён последний vanilla-файл, а когда выполнены проверяемые цели:

- каждая admin workspace имеет явного владельца состояния и DOM;
- feature components не импортируются infrastructure-модулями вроде i18n или API client;
- Commands/Awards используют общие primitives без копирования lifecycle;
- критические admin flows исполняются в automated browser/DOM tests;
- `npm test`, typecheck, lint, `go test ./...`, `golangci-lint run ./...` и production builds входят в обязательные gates;
- Windows OBS и Wails smoke подтверждают совместимость production bundle;
- overlay, leaderboard, alert и dock сохраняют текущие performance, transparency, audio, queue и reconnect контракты;
- релиз остаётся одним локальным executable.

## Не-цели

- одномоментно переписать весь `web/`;
- изменить HTTP/WebSocket API вместе с UI migration без отдельной необходимости;
- перенести product config или viewer data;
- переписать существующий design system или темы overlay;
- добавить SSR, cloud service или JavaScript backend;
- использовать смену фреймворка как замену разбиению модулей и тестам.

## Процесс планирования

Полный переход админки — программа уровня Tier 3, а не один большой pull request. Каждый срез оформляется отдельным `desktop-change` с явными UI, browser target, build, rollback и QA контрактами. Этап стабилизации и первый catalog pilot могут быть отдельными bounded changes; расширять миграцию следует только после проверки пилота.

Открытые решения перед первым proposal:

1. Подтверждает ли опыт сопровождающих Vue, или практичнее выбрать React?
2. Где живёт source tree админки и какой каталог является только generated output?
3. Какой минимальный version matrix фиксируется для OBS CEF, WebView2 и WebKitGTK?
4. Нужен ли `checkJs` как промежуточный шаг до перевода модулей на TypeScript?
5. Переносить ли первым только Commands/Awards island или всю Audience workspace после подготовки тестов?
