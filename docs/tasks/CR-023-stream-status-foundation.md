# CR-023: Stream Status Foundation

Status: `done`

## Goal

Добавить нормализованную модель состояния эфира, отдельную от чата, и показать её в админке без сбора зрителей и HLS.

## Context

Research: [Platform stream diagnostics](../research/platform-stream-diagnostics.md).

`GET /api/diagnostics` и `internal/connector/status` описывают chat connector, не видео. Нельзя смешивать live/offline эфира с connected/reconnecting чата. Эта задача — фундамент (как CR-018 для эмоутов): контракт, store, API и полоса в админке. Guest-адаптеры платформ — следующие задачи.

## Scope

- Пакет `internal/streamstatus`: `Snapshot`, capability flags, nullable viewers, независимые слои metadata/chat/playback/ingest/probe.
- In-memory store: текущий snapshot по платформе и кольцевой буфер истории (~30–60 мин).
- `GET /api/streams/status` — текущие snapshots и агрегат; chat слой из `status.Registry`.
- Без мониторов: `state=unknown`, capabilities только `chat_health`, viewers `null` (не `0`), playback/ingest `supported: false`.
- Компактная полоса в админке (Systems), рендер по capabilities.
- Redaction: в JSON нет signed URL и секретов; `0` ≠ unknown; timeout/отсутствие монитора ≠ offline.

## Out Of Scope

- Twitch GraphQL / Helix / HLS.
- YouTube page viewers, API key, `liveStreams.list`.
- VK `public_video_stream` и HLS.
- `POST /api/streams/probe`, событие в `/ws`, overlay.
- Расширение `GET /api/diagnostics` историей эфира.
- Изменение `ChatMessage` и остановка chat connector при ошибке monitor-а.

## Acceptance Criteria

- `GET /api/streams/status` отдаёт twitch/youtube/vk snapshots с `state=unknown` и `viewers.current=null` до появления мониторов.
- Chat state берётся из существующего connector registry и не подменяет stream state.
- Админка показывает полосу эфиров; для unknown viewers — тире, не ноль.
- JSON не содержит signed playback URL и токенов.
- Ошибка/отсутствие stream monitor не меняет chat connector и не публикует `ChatMessage`.

## Checks

- `gofmt` on touched Go files
- `go test ./internal/streamstatus ./internal/api ./internal/bootstrap`
- `golangci-lint run ./internal/streamstatus/... ./internal/api/... ./internal/bootstrap/...`
- `npm run lint` and `npm run test:i18n` if `web/**/*.js` changed

## Completion

- `internal/streamstatus`: Snapshot, in-memory store/history, Compose from config + connector registry, signed-URL/token redaction.
- `GET /api/streams/status` returns twitch/youtube/vk with `state=unknown` and null viewers until monitors exist; chat state comes from `status.Registry`.
- Admin Systems strip polls the new endpoint and renders by capabilities (unknown viewers as em dash, not 0).
- Checks: `go test ./...`, `golangci-lint run ./internal/streamstatus/... ./internal/api/... ./internal/bootstrap/...`, `npm run lint`, `npm run test:i18n`.

## Notes For Agent

- API: GET для чтения допустим; мутации только `POST /api/<resource>/<action>`. Не использовать PUT/PATCH/DELETE и `{id}` в `/api/`.
- UI строить по `capabilities`, не `if (platform === ...)`.
- Cross-platform total подписывать как сумму по платформам, не как уникальных зрителей.
