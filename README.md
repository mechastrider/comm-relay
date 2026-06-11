# CommRelay

Локальное приложение на Go: объединяет чаты стриминговых платформ (Twitch, YouTube Live, VK Live) и выводит сообщения в OBS через Browser Source. Один бинарник, без облака и без Docker/Node/БД.

Подробнее о продукте: [`docs/concept.md`](docs/concept.md).

## Возможности

- **Платформы:** Twitch IRC, YouTube Live Chat (OAuth), VK Live / VK Video (публичный WebSocket API).
- **OBS overlay** (`/overlay`): прозрачный фон, лимит сообщений, TTL, размер шрифта, режимы `normal` / `compact`, темы `default` / `dashboard`.
- **Rich chat:** нативные эмоуты Twitch, FrankerFaceZ, BetterTTV, 7TV; безопасные превью картинок по whitelist хостов.
- **Админка** (`/`): статусы коннекторов, live-монитор сообщений, диагностика, звук при новых сообщениях.
- **WebSocket** (`/ws`): доставка сообщений в overlay в реальном времени.
- **Устойчивость:** автоматический reconnect коннекторов, graceful shutdown (Ctrl+C).
- **Десктоп (Wails):** то же приложение в окне WebView, single-instance.

Статика админки и overlay **встроена в бинарник**; для правок UI без пересборки используйте флаг `-web ./web`.

## Требования

- **Go 1.26.3+** (см. [`go.mod`](go.mod))

## Быстрый старт

Из корня репозитория:

```powershell
go mod download
go run ./cmd/comm-relay-server
```

При первом запуске создаётся `config.json` с настройками по умолчанию. Сервер слушает порт **17877**.

Откройте админку: http://127.0.0.1:17877/

## OBS Browser Source

1. В OBS добавьте источник **Browser**.
2. URL: `http://127.0.0.1:17877/overlay` (замените порт, если меняли `server_port`).
3. Ширина/высота — под ваш макет; фон прозрачный.
4. Включите нужные коннекторы в админке и сохраните настройки.

Сообщения приходят по WebSocket; при переподключении overlay получает буфер недавних сообщений.

## Сборка

```powershell
go build -o comm-relay.exe ./cmd/comm-relay-server
.\comm-relay.exe
```

На Linux/macOS имя бинарника можно оставить `comm-relay`.

## Десктоп-приложение (Wails)

Окно с той же админкой: в фоне поднимается локальный HTTP-сервер, WebView открывает `http://127.0.0.1:<порт>/`. OBS overlay по-прежнему использует тот же хост и порт, например `http://127.0.0.1:17877/overlay`.

**Требования:** [Wails v2](https://wails.io/) (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`), на Linux — `libgtk-3-dev` и `libwebkit2gtk-4.1-dev` (см. `wails doctor`).

Сборка из корня репозитория:

```powershell
go build -tags wails -o comm-relay-desktop ./cmd/comm-relay-desktop
```

Или через Wails CLI из каталога приложения (артефакт в `build/bin/`):

```powershell
cd cmd/comm-relay-desktop
wails build
```

По умолчанию настройки сохраняются в каталог пользователя:

| ОС | Путь к `config.json` |
|----|----------------------|
| Windows | `%AppData%\comm-relay\config.json` |
| Linux | `~/.config/comm-relay/config.json` |
| macOS | `~/Library/Application Support/comm-relay/config.json` |

Флаг `-config` переопределяет путь. Повторный запуск поднимает уже открытое окно (single-instance).

## Флаги запуска

### Сервер (`cmd/comm-relay-server`)

| Флаг | По умолчанию | Описание |
|------|--------------|----------|
| `-config` | `config.json` | Путь к файлу настроек |
| `-addr` | из `server_port` в конфиге | Адрес прослушивания HTTP (перекрывает порт из конфига) |
| `-web` | встроенная статика | Папка `web/` на диске (для разработки UI) |
| `-debug` | выкл. | Подробное логирование |

Пример с другим портом:

```powershell
go run ./cmd/comm-relay-server -addr 127.0.0.1:8080
```

### Десктоп (`cmd/comm-relay-desktop`)

| Флаг | По умолчанию | Описание |
|------|--------------|----------|
| `-config` | каталог пользователя | Путь к `config.json` |
| `-web` | встроенная статика | Папка `web/` на диске |
| `-debug` | выкл. | Подробное логирование |

## Эндпоинты

| URL | Назначение |
|-----|------------|
| http://127.0.0.1:17877/ | Админка |
| http://127.0.0.1:17877/overlay | OBS Browser Source |
| http://127.0.0.1:17877/health | Health check → `{"status":"ok"}` |
| ws://127.0.0.1:17877/ws | WebSocket с сообщениями чата |
| GET/PATCH `/api/config` | Чтение и обновление настроек (JSON, snake_case) |
| GET `/api/status` | Статусы коннекторов |
| GET `/api/diagnostics` | Uptime, WebSocket-клиенты, счётчики сообщений, кэш эмоутов |
| GET `/api/messages/recent` | Недавние сообщения для админки |
| GET `/oauth/youtube/start` | Начало OAuth YouTube |
| GET `/oauth/youtube/callback` | Callback OAuth YouTube |

Проверка health:

```powershell
curl http://127.0.0.1:17877/health
```

Остановка сервера: **Ctrl+C** (graceful shutdown, таймаут 15 с).

## Настройка платформ

Все настройки доступны в админке (диалог **Connections**) и в `config.json`. После изменений нажмите **Save**.

### Twitch

Включите коннектор и укажите имя канала (без `#`):

```json
"twitch": {
  "enabled": true,
  "channel": "имя_канала"
}
```

### YouTube Live

1. В [Google Cloud Console](https://console.cloud.google.com/) создайте OAuth client (тип **Desktop** или **Web** с redirect URI ниже).
2. Включите **YouTube Data API v3**.
3. Redirect URI должен совпадать с `server_port` в `config.json`:

   `http://127.0.0.1:17877/oauth/youtube/callback`

   (замените `17877`, если изменили порт в конфиге.)

4. В админке укажите **OAuth client ID** и **client secret**, нажмите **Save settings**.
5. Нажмите **Connect YouTube**, пройдите авторизацию Google.
6. Включите **Enable YouTube connector** и снова сохраните настройки.

Сообщения YouTube Live Chat появятся в overlay, когда у аккаунта идёт активный эфир с live chat.

OAuth-токены сохраняются в локальный `config.json` и не попадают в логи. Файл в `.gitignore` — не коммитьте его с секретами.

### VK Live

OAuth не требуется. Укажите slug канала или URL `live.vkvideo.ru`:

```json
"vk": {
  "enabled": true,
  "channel": "slug_канала"
}
```

Коннектор подключается к публичному WebSocket API VK Video и работает параллельно с Twitch и YouTube.

## Overlay и rich chat

В админке (диалоги **Overlay** и **Rich chat**):

- **Display:** `max_messages`, `message_ttl_seconds`, `font_size_px`, layout (`normal` / `compact`), theme (`default` / `dashboard`).
- **Emotes:** Twitch, FFZ, BTTV, 7TV (кэш подгружается по каналу Twitch).
- **Image previews:** только HTTPS-ссылки с разрешённых хостов; сервер не скачивает пользовательские URL — рендер на стороне overlay.

Звук новых сообщений в админке настраивается в диалоге **Sound** (только для панели управления, не для OBS).

## Разработка

```powershell
go test ./...
go build ./...
go build -tags wails -o comm-relay-desktop ./cmd/comm-relay-desktop
```

Для правок UI без пересборки Go-бинарника:

```powershell
go run ./cmd/comm-relay-server -web ./web
```

Структура проекта и правила для агентов: [`AGENTS.md`](AGENTS.md).

```text
cmd/comm-relay-server/   headless-сервер
cmd/comm-relay-desktop/  Wails-оболочка (build tag wails)
internal/api/            HTTP, WebSocket, OAuth
internal/bootstrap/      Сборка и запуск приложения
internal/bus/            Внутренняя шина событий
internal/connector/      Twitch, YouTube, VK
internal/config/         config.json
web/                     Статика админки и overlay (embed + -web)
```

## Частые проблемы

- **Порт 17877 занят** — остановите другой процесс или запустите с `-addr 127.0.0.1:<порт>` (и обновите URL в OBS).
- **YouTube OAuth не проходит** — redirect URI в Google Cloud должен точно совпадать с `server_port` в конфиге; при смене порта через `-addr` обновите и `server_port`, и redirect URI.
- **Нет сообщений в overlay** — проверьте статусы коннекторов в админке; для YouTube нужен активный эфир с live chat.
- **Разработка UI** — используйте `-web ./web`; для обычного запуска папка `web/` на диске не нужна.

## Лицензия

Проект распространяется под [MIT License](LICENSE). Copyright (c) 2026 Igor Lazarev.
