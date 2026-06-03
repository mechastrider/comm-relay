# Chat Relay (comm-relay)

Локальное приложение на Go: объединяет чаты стриминговых платформ (Twitch, YouTube, VK Live) и выводит сообщения в OBS через Browser Source. Один бинарник, без облака и без Docker/Node/БД.

Подробнее о продукте: [`docs/concept.md`](docs/concept.md).

## Требования

- **Go 1.26.3+** (см. [`go.mod`](go.mod))

## Быстрый старт

Из корня репозитория:

```powershell
go mod download
go run ./cmd/chat-relay
```

При первом запуске создаётся `config.json` с настройками по умолчанию. Сервер слушает порт **17877**.

## Сборка

```powershell
go build -o chat-relay.exe ./cmd/chat-relay
.\chat-relay.exe
```

На Linux/macOS имя бинарника можно оставить `chat-relay`.

## Флаги запуска

| Флаг | По умолчанию | Описание |
|------|--------------|----------|
| `-config` | `config.json` | Путь к файлу настроек |
| `-addr` | из `server_port` в конфиге | Адрес прослушивания HTTP (перекрывает конфиг) |
| `-web` | авто (`./web`) | Папка со статикой (админка и overlay) |
| `-debug` | выкл. | Подробное логирование |

Пример с другим портом:

```powershell
go run ./cmd/chat-relay -addr 127.0.0.1:8080
```

## Эндпоинты

| URL | Назначение |
|-----|------------|
| http://127.0.0.1:17877/ | Админка |
| http://127.0.0.1:17877/overlay | OBS Browser Source (прозрачный фон) |
| http://127.0.0.1:17877/health | Health check → `{"status":"ok"}` |
| ws://127.0.0.1:17877/ws | WebSocket с сообщениями чата |

Проверка health:

```powershell
curl http://127.0.0.1:17877/health
```

Остановка сервера: **Ctrl+C** (graceful shutdown).

## Настройка YouTube Live

1. В [Google Cloud Console](https://console.cloud.google.com/) создайте OAuth client (тип **Desktop** или **Web** с redirect URI ниже).
2. Включите **YouTube Data API v3**.
3. Redirect URI должен совпадать с портом из `config.json`:

   `http://127.0.0.1:17877/oauth/youtube/callback`

   (замените `17877`, если изменили `server_port`.)

4. В админке http://127.0.0.1:17877/ укажите **OAuth client ID** и **client secret**, нажмите **Save settings**.
5. Нажмите **Connect YouTube**, пройдите авторизацию Google.
6. Включите **Enable YouTube connector** и снова сохраните настройки.

Сообщения YouTube Live Chat появятся в overlay вместе с Twitch, когда у аккаунта идёт активный эфир с live chat.

OAuth-токены сохраняются в локальный `config.json` и не попадают в логи. Файл в `.gitignore` — не коммитьте его с секретами.

## Настройка Twitch

В `config.json` или через админку включите коннектор и укажите канал:

```json
"twitch": {
  "enabled": true,
  "channel": "имя_канала"
}
```

## Разработка

```powershell
go test ./...
go build ./...
```

Структура проекта и правила для агентов: [`AGENTS.md`](AGENTS.md).

## Частые проблемы

- **Порт 17877 занят** — остановите другой процесс или запустите с `-addr 127.0.0.1:<порт>`.
- **Не найдена папка `web`** — запускайте из корня репозитория или передайте `-web ./web`.
