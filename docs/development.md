# Разработка CommRelay

**Язык / Language:** [Русский](development.md) · [English](development.en.md)

В этом документе собраны команды для локальной разработки, сборки desktop-приложения и подготовки релиза. Пользовательская установка и подключение к OBS описаны в [README](../README.md).

## Требования

- **Go 1.26.3+** — версия зафиксирована в [`go.mod`](../go.mod).
- **Node.js 22+** — нужен для проверки и live reload статического интерфейса.
- [Task](https://taskfile.dev/) — рекомендуется для полного dev-цикла.
- [Wails v2](https://wails.io/) — нужен только для сборки desktop-приложения.

Статика админки, OBS dock и overlay встроена в бинарник. При локальной разработке её можно подменить файлами из `web/`.

## Основные проверки

```bash
go mod download
go build ./...
go test ./... -race
npm ci
npm run lint
```

Линтер Go как в CI:

```bash
go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.12.2
golangci-lint run ./...
```

## Dev-сервер с live reload

Установите инструменты и запустите dev-стек:

```bash
task tools:install
task web:dev
```

`task web:dev` запускает Go-сервер через Air и обновление файлов из `web/`; интерфейс доступен по адресу `http://127.0.0.1:17878`. Рабочие данные лежат в `var/data/`. Чтобы заново скопировать данные desktop-установки (`config.json`, базу и `overlay-assets`), выполните:

```bash
task data:sync
```

## Headless-сервер

Для backend, админки и overlay можно запустить сервер без desktop-оболочки:

```bash
go run ./cmd/comm-relay-server -web ./web
```

По умолчанию сервер слушает `127.0.0.1:17877` и создаёт `config.json` рядом с рабочей директорией.

| Флаг | Назначение |
|------|------------|
| `-web ./web` | Подменить встроенную статику файлами из репозитория |
| `-config путь` | Использовать другой `config.json` |
| `-addr 127.0.0.1:порт` | Переопределить адрес из конфига |
| `-debug` | Включить подробные логи |

Сборка headless-бинарника:

| Система | Сборка | Запуск |
|---------|--------|--------|
| Windows | `go build -o comm-relay.exe ./cmd/comm-relay-server` | `.\comm-relay.exe -web .\web` |
| Linux / macOS | `go build -o comm-relay ./cmd/comm-relay-server` | `./comm-relay -web ./web` |

## Desktop-сборка (Wails)

Установите Wails CLI:

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@v2.12.0
```

Соберите приложение из корня репозитория:

```bash
cd cmd/comm-relay-desktop
wails build
```

Готовый бинарник появится в `cmd/comm-relay-desktop/build/bin/`.

### Windows

- Нужны **Go 1.26.3+** и **WebView2** (в Windows 11 обычно уже установлен).
- Дополнительные SDK для Wails не нужны.
- Проверка окружения: `wails doctor`.

### Linux

Для сборки desktop-приложения в Ubuntu, Debian или Linux Mint:

```bash
sudo apt update
sudo apt install build-essential pkg-config \
  libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev
```

Если `libwebkit2gtk-4.1-dev` недоступен, установите эквивалент **WebKitGTK 4.1** из репозитория дистрибутива.

Источник **Browser** и **Custom Browser Docks** есть не во всех пакетах OBS из стандартных репозиториев. Для проверки overlay и dock используйте OBS из [официального PPA](https://obsproject.com/kb/linux-installation) или Flatpak с Flathub. На Wayland док-панели могут быть недоступны — при необходимости используйте сессию X11.

### macOS

- Нужны **Go 1.26.3+** и **Xcode Command Line Tools** (`xcode-select --install`).
- Сборка под текущую машину: `wails build`.
- Универсальная сборка как в CI: `wails build -platform darwin/universal`.
- Неподписанную локальную сборку открывайте через **Open** в контекстном меню Finder или из терминала.

## Основные URL

| URL | Назначение |
|-----|------------|
| `http://127.0.0.1:17877/` | Админка |
| `http://127.0.0.1:17877/dock/messages` | Журнал сообщений в OBS |
| `http://127.0.0.1:17877/overlay` | OBS Browser Source: чат |
| `http://127.0.0.1:17877/overlay/leaderboard` | OBS Browser Source: лидерборд |
| `http://127.0.0.1:17877/overlay/alert` | OBS Browser Source: баннеры и звук |
| `http://127.0.0.1:17877/health` | Health check |
| `ws://127.0.0.1:17877/ws` | WebSocket с событиями |

Архитектура и правила репозитория описаны в [`AGENTS.md`](../AGENTS.md), продуктовый контекст — в [`concept.md`](concept.md), следующий горизонт — в [`roadmap.md`](roadmap.md).

## Релизы

Workflow [`.github/workflows/release.yml`](../.github/workflows/release.yml) проверяет проект и собирает desktop-архивы для Windows, macOS и Linux при публикации тега `v*.*.*` или ручном запуске.

Перед релизом добавьте пользовательские изменения в `## [Unreleased]` файла [`CHANGELOG.md`](../CHANGELOG.md). При публикации workflow:

1. проверит, что в `[Unreleased]` есть записи;
2. перенесёт их в секцию версии с датой;
3. создаст пустую секцию `[Unreleased]`;
4. закоммитит обновлённый changelog в `main`;
5. использует текст секции версии для GitHub Release.

Пример:

```bash
git tag v0.6.0
git push origin v0.6.0
```

Если секция версии уже существует, workflow не дублирует её.
