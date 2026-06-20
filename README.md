# CommRelay

CommRelay собирает сообщения из Twitch, YouTube Live и VK Live в один локальный чат для OBS. Приложение запускается на вашем компьютере, не использует облачный relay-сервер и показывает overlay через обычный OBS Browser Source.

Первый публичный релиз: **v0.1.0**. История изменений ведётся в [`CHANGELOG.md`](CHANGELOG.md).

## Что умеет

- Подключает Twitch, YouTube Live Chat и VK Live / VK Video.
- Показывает единый прозрачный overlay для OBS: `http://127.0.0.1:17877/overlay`.
- Даёт локальную панель управления со статусами, монитором сообщений, настройками overlay и диагностикой.
- Поддерживает Twitch emotes, FrankerFaceZ, BetterTTV, 7TV и безопасные превью картинок.
- Автоматически переподключает коннекторы и хранит настройки локально в `config.json`.

## Скачать и установить

Готовые сборки публикуются на странице [GitHub Releases](https://github.com/mechastrider/comm-relay/releases). Для обычного использования Go, Node, Docker и база данных не нужны.

Выберите архив под вашу систему:

| Система | Файл релиза | Запуск |
|---------|-------------|--------|
| Windows 11, 64-bit | `CommRelay-v0.1.0-windows-amd64.zip` | Распакуйте архив и запустите `CommRelay.exe`. |
| macOS, 64-bit | `CommRelay-v0.1.0-macos-universal.zip` | Распакуйте архив и откройте `CommRelay.app`. |
| Linux, 64-bit | `CommRelay-v0.1.0-linux-amd64.tar.gz` | Распакуйте архив, сделайте файл исполняемым и запустите `./CommRelay`. |

Windows и macOS могут предупредить, что приложение не подписано. Это ожидаемо для раннего релиза: на macOS используйте **Open** через контекстное меню Finder, на Windows подтвердите запуск через **More info** → **Run anyway**.

### Linux зависимости

На Linux desktop-сборке нужны системные библиотеки GTK/WebKit. Для Ubuntu/Debian:

```bash
sudo apt update
sudo apt install libgtk-3-0 libwebkit2gtk-4.1-0
```

Если в вашем дистрибутиве нет пакета `libwebkit2gtk-4.1-0`, установите эквивалент WebKitGTK 4.1 из репозитория дистрибутива.

## Первый запуск

1. Запустите приложение. Откроется окно CommRelay, а внутри поднимется локальный сервер.
2. Откройте **Connections** и включите нужные платформы.
3. Нажмите **Save** после изменения настроек.
4. Добавьте overlay в OBS по инструкции ниже.

По умолчанию CommRelay слушает `127.0.0.1:17877`. Админка доступна по `http://127.0.0.1:17877/`, а overlay по `http://127.0.0.1:17877/overlay`.

## OBS Browser Source

1. В OBS добавьте источник **Browser**.
2. В поле **URL** вставьте `http://127.0.0.1:17877/overlay`.
3. Задайте размер под ваш макет сцены, например `800x600` или ширину всей сцены.
4. Не добавляйте фон вручную: overlay уже прозрачный.
5. Оставьте CommRelay запущенным во время стрима.

Если вы поменяли порт в настройках, обновите URL в OBS.

## Настройки overlay

Откройте **Overlay** в панели управления CommRelay.

| Настройка | Что делает |
|-----------|------------|
| **Max messages** | Сколько последних сообщений держит overlay на экране. |
| **Message TTL** | Через сколько секунд сообщение исчезает (0 — не удалять по времени). |
| **Font size** | Размер текста в overlay, от **12 до 48 px**. |
| **Spacing** | **Comfortable** — обычные отступы. **Compact** — плотнее, если на экране много строк. |
| **Theme** | **Default** — карточки с полупрозрачным фоном. **Text only** — только текст без фона (удобно на зелёном фоне OBS). |

После любого изменения:

1. Нажмите **Save settings**.
2. Обновите Browser Source в OBS: правый клик по источнику → **Refresh cache of current page** (или кнопка обновления в свойствах источника).

Без перезагрузки в OBS overlay продолжит работать со старыми параметрами.

**Совет:** чтобы сравнить темы, дождитесь нескольких сообщений в чате — на пустом экране разница не видна.

## Настройка платформ

Все настройки находятся в панели управления, кнопка **Connections**.

### Twitch

Включите Twitch и укажите название канала без `#`. OAuth не нужен: CommRelay читает публичный чат через Twitch IRC.

### YouTube Live

Есть два режима подключения:

**Simple (video URL)** — без Google Cloud и OAuth:

1. В админке выберите **Connection mode → Simple (video URL)**.
2. Укажите **Channel handle** (`@name` или URL канала) — CommRelay сам найдёт текущий эфир.
3. Либо вставьте URL/ID конкретного live-видео (имеет приоритет над автопоиском).
4. Включите YouTube connector и сохраните настройки.

**API (OAuth)** — для автоматического чтения чата авторизованного аккаунта:

1. Откройте [Google Cloud Console](https://console.cloud.google.com/).
2. Создайте OAuth client и включите **YouTube Data API v3**.
3. Добавьте redirect URI: `http://127.0.0.1:17877/oauth/youtube/callback`.
4. В CommRelay вставьте **OAuth client ID** и **client secret**, сохраните настройки.
5. Нажмите **Connect YouTube** и пройдите авторизацию Google.
6. Включите YouTube connector и сохраните настройки ещё раз.

В simple mode читается публичный live chat по URL. В API mode сообщения появятся, когда у авторизованного аккаунта идёт активный эфир с live chat.

Simple mode использует недокументированный InnerTube API (как веб-плеер YouTube). Формат может измениться без предупреждения; при проблемах попробуйте API mode.

### VK Live

OAuth не требуется. Укажите slug канала или URL `live.vkvideo.ru`, затем включите VK connector и сохраните настройки.

## Где хранятся настройки

Настройки, OAuth-токены и локальные параметры хранятся только на вашем компьютере.

| Система | Путь к `config.json` |
|---------|----------------------|
| Windows | `%AppData%\comm-relay\config.json` |
| macOS | `~/Library/Application Support/comm-relay/config.json` |
| Linux | `~/.config/comm-relay/config.json` |

Не публикуйте `config.json`, если в нём есть OAuth client secret или токены.

## Обновление

Скачайте новый архив из [Releases](https://github.com/mechastrider/comm-relay/releases), закройте старое приложение и замените файлы приложения. Пользовательский `config.json` находится отдельно, поэтому настройки сохранятся.

Перед обновлением смотрите [`CHANGELOG.md`](CHANGELOG.md): там отмечены новые возможности, исправления и возможные ручные действия.

## Частые проблемы

- **Меняю шрифт или тему — ничего не меняется**: нажмите **Save settings**, затем обновите Browser Source в OBS. Размер шрифта — только от 12 до 48 px.
- **Spacing и Theme «одинаковые»**: сравнивайте при активном чате; Compact заметнее при 5+ сообщениях; Text only лучше виден на зелёном или тёмном фоне сцены.
- **OBS ничего не показывает**: проверьте, что CommRelay запущен, URL в Browser Source совпадает с портом, а connector в админке имеет статус `connected`.
- **Порт 17877 занят**: закройте другое приложение на этом порту или запустите CommRelay с другим адресом через `-addr 127.0.0.1:<порт>`.
- **YouTube OAuth не проходит**: redirect URI в Google Cloud должен точно совпадать с портом из `config.json`.
- **Нет сообщений YouTube**: нужен активный эфир с включённым live chat; в simple mode проверьте URL видео.
- **Simple mode не подключается**: YouTube может показать consent/captcha — попробуйте API mode или обновите URL эфира.
- **macOS не открывает приложение**: ранние сборки не подписаны; используйте **Open** из контекстного меню Finder.
- **Linux не запускает окно**: установите GTK/WebKit зависимости из раздела Linux.

## Для разработчиков

Нужен **Go 1.26.3+**. Статика админки и overlay встроена в бинарник; для разработки UI можно подменить её папкой `web/`.

```powershell
go mod download
go test ./...
go build ./...
go run ./cmd/comm-relay-server -web ./web
```

Desktop-сборка использует [Wails v2](https://wails.io/):

```powershell
go install github.com/wailsapp/wails/v2/cmd/wails@v2.12.0
cd cmd/comm-relay-desktop
wails build
```

Headless server без desktop-окна:

```powershell
go build -o comm-relay.exe ./cmd/comm-relay-server
.\comm-relay.exe
```

Основные URL:

| URL | Назначение |
|-----|------------|
| `http://127.0.0.1:17877/` | Админка |
| `http://127.0.0.1:17877/overlay` | OBS Browser Source |
| `http://127.0.0.1:17877/health` | Health check |
| `ws://127.0.0.1:17877/ws` | WebSocket с сообщениями |

Структура проекта и правила для агентов: [`AGENTS.md`](AGENTS.md). Подробнее о продукте: [`docs/concept.md`](docs/concept.md).

## Релизы

Release workflow собирает desktop-архивы для Windows, macOS и Linux при публикации тега `v*.*.*`, а также доступен вручную через GitHub Actions.

Первый релиз:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Workflow возьмёт описание релиза из [`CHANGELOG.md`](CHANGELOG.md).

## Лицензия

Проект распространяется под [MIT License](LICENSE). Copyright (c) 2026 Igor Lazarev.
