# Диагностика эфиров Twitch, YouTube и VK Видео Live

Дата исследования: 2026-08-16

## Цель

Определить, какие полезные данные о прямом эфире CommRelay может получать:

- без авторизации зрителя или владельца канала;
- с ключом или токеном зарегистрированного приложения;
- с OAuth владельца канала;
- без дублирования локальной статистики OBS.

Под «гостевым режимом» ниже понимается чтение общедоступных данных так, как это делает веб-сайт платформы. Это не всегда официальный публичный API: для Twitch, YouTube page mode и VK Видео Live часть endpoint-ов недокументирована и может измениться.

## Краткий вывод

Полезный первый релиз можно сделать полностью без входа пользователя:

1. Показывать для каждой платформы `offline / upcoming / live / degraded / unknown`.
2. Собирать текущее число зрителей, время начала, название и категорию, когда платформа их публикует.
3. Хранить короткую историю замеров и считать локальный пик, минимум, среднее и тренд.
4. Отдельно проверять доступность эфира со стороны зрителя: открывается ли manifest и продолжает ли он обновляться.
5. Отдельно показывать состояние chat connector-а и свежесть последнего успешного запроса.

Наиболее полный следующий шаг — YouTube OAuth: только YouTube официально отдаёт владельцу детализированный ingest health с причинами вроде низкого bitrate, отсутствия аудио и несовпадения frame rate. Twitch App даёт стабильные официальные метаданные и зрителей, но не аналог YouTube ingest health. У VK уже достаточно богатый гостевой endpoint; возможности зарегистрированного приложения полезны прежде всего для webhook-событий, но текущую app-документацию нельзя считать надёжной основой для MVP.

Рекомендуемая очередность:

1. Guest MVP для всех трёх платформ.
2. Twitch App token и YouTube API key как официальные источники публичных метаданных.
3. YouTube OAuth для настоящей диагностики входящего потока.
4. Twitch user OAuth и VK App только для конкретных новых сценариев, а не «на всякий случай».

## Что считать «качеством эфира»

Слово «качество» объединяет несколько разных сигналов. Их нельзя сводить к одному зелёному индикатору.

| Слой | Что проверяется | Что означает сбой |
|---|---|---|
| Локальный encoder | OBS bitrate, dropped frames, CPU/GPU, reconnect | Проблема до отправки или на стороне компьютера |
| Ingest платформы | Принимает ли платформа поток, bitrate/audio/video/configuration issues | Проблема между OBS и ingest либо в настройках кодера |
| Публикация | Платформа считает эфир live, создала ли broadcast/player | Поток принят не полностью или ещё не опубликован |
| Viewer-side playback | Доступен ли HLS/DASH manifest, движется ли media sequence | Зритель с этой сети может получить обновляющийся поток |
| Chat | Подключён ли chat connector, идут ли сообщения/heartbeat | Проблема чата, не обязательно видео |
| Общая платформа | Есть ли подтверждённый incident у сервиса | Массовая проблема платформы |

CommRelay не должен повторять encoder-метрики OBS. Его полезная зона — всё после OBS: платформа приняла эфир, опубликовала его, показывает зрителей, отдаёт поток зрителю и не сообщает о platform incident.

Viewer-side probe не доказывает глобальный сбой. Корректные формулировки:

- `probe_error` — локальная проверка завершилась ошибкой;
- `playback_unavailable_from_this_device` — поток не открывается из сети, где запущен CommRelay;
- `manifest_stalled` — manifest доступен, но несколько проверок подряд не продвигается;
- `platform_incident` — сбой подтверждён официальным status endpoint;
- `ingest_degraded` — платформа сообщила владельцу о проблемах входящего потока.

## Сводная матрица режимов

Обозначения: «да» — устойчивый документированный источник; «best effort» — технически доступно, но через недокументированный web API; «условно» — поле может быть скрыто владельцем или отсутствовать; «нет» — платформа не предоставляет такой сигнал в данном режиме.

| Платформа и режим | Вход пользователя | Live/offline | Зрители | Метаданные | Viewer-side playback | Ingest health | События |
|---|---:|---:|---:|---:|---:|---:|---:|
| Twitch Guest | нет | best effort | best effort | best effort | best effort | нет | IRC chat |
| Twitch App | нет, нужны credentials приложения | да | да | да | best effort | нет | webhook EventSub, неудобен local-only приложению |
| Twitch User OAuth | да | да | да | да | best effort | нет | EventSub WebSocket и owner-only данные |
| YouTube Guest/Page | нет | best effort | условно | best effort | условно/best effort | нет | InnerTube live chat |
| YouTube API key | нет, нужен ключ проекта | да для известного video ID | условно | да | нет | нет | polling |
| YouTube OAuth | да | да | условно | да, включая свои broadcast/stream | отдельно best effort | **да** | chat stream/polling |
| VK Guest | нет | best effort | best effort | best effort | best effort | нет | public WebSocket |
| VK App | зависит от метода/grant | да через guest и lifecycle hooks | guest endpoint | guest endpoint + hooks | guest endpoint | не подтверждено | webhooks приложения |

## Twitch

### Текущее состояние CommRelay

Twitch connector уже читает публичный чат через anonymous IRC и не требует OAuth: [`internal/connector/twitch/connector.go`](../../internal/connector/twitch/connector.go). Его состояние сейчас описывает соединение с чатом, а не состояние видео.

### Twitch Guest

Практический гостевой вариант состоит из трёх независимых источников.

#### 1. Публичный Twitch GraphQL

Web-клиент Twitch обращается к `https://gql.twitch.tv/gql`. Без пользовательского OAuth в проверке 2026-08-16 удалось получить:

- live/offline;
- stream ID;
- `createdAt`;
- `viewersCount`;
- title;
- category/game;
- stream type.

Это подходит для текущего числа зрителей и основных метаданных. Однако GraphQL web schema, persisted query hashes и web Client ID официально не являются стабильным third-party контрактом. Любая ошибка этого источника должна давать `unknown`, а не ложный `offline`.

#### 2. Anonymous playback token и HLS

Web-плеер получает playback access token через GraphQL, затем открывает master playlist на `usher.ttvnw.net`. В живой проверке были доступны source и transcode-варианты, например 1080p60, 720p60, 480p30, 360p30 и 160p30.

Без скачивания медиасегментов можно собирать:

- доступность master playlist;
- список resolution/FPS/codecs/bandwidth;
- наличие source-варианта;
- продвижение `EXT-X-MEDIA-SEQUENCE` в media playlist;
- изменение `EXT-X-PROGRAM-DATE-TIME` и приблизительную задержку от текущего времени;
- время ответа CDN и серию сетевых ошибок.

Ограничения:

- playback token и подписанные URL краткоживущие, их нельзя сохранять или отдавать в admin API;
- Twitch может потребовать client-integrity token или изменить persisted queries;
- отсутствие transcode-варианта не означает аварию: набор качеств зависит от канала и ресурсов платформы;
- probe видит доступность только из сети пользователя CommRelay.

Streamlink использует ту же практическую цепочку GraphQL → playback token → HLS и регулярно адаптируется к изменениям Twitch. Это хороший ориентир реализации, но не гарантия API-совместимости.

#### 3. Официальный Twitch Status

`https://status.twitch.com/api/v2/summary.json` публично сообщает состояние компонентов, включая Video (Watching), Video (Broadcasting) и Chat. Его стоит показывать как отдельный глобальный сигнал, не смешивая с локальным HLS probe.

#### Что не следует выводить из гостевых данных

- Список пользователей в IRC не равен числу зрителей.
- Активность сообщений не доказывает, что видео воспроизводится.
- IRC raid notice может содержать число участников рейда, но это не текущая аудитория канала.
- Ошибка GraphQL/HLS может означать изменение защиты web API, региональное ограничение, proxy/DNS или временную блокировку, а не offline.

### Twitch App access token

Официальный Helix API требует зарегистрированное Twitch application и app access token, получаемый по client credentials grant. Стример не проходит consent: это авторизация самого приложения для чтения публичных данных.

Полезные методы без scopes владельца:

- `GET /helix/streams` — live/offline, `viewer_count`, `started_at`, title, game/category, language, tags, thumbnail;
- `GET /helix/channels` — title, game, language, tags, content classification labels и часть channel metadata;
- `GET /helix/users` — display name, profile image и идентификаторы;
- `GET /helix/schedule` — расписание, если канал его ведёт;
- `GET /helix/videos` и clips endpoints — записи/клипы для post-stream сценариев.

Для диагностики достаточно опрашивать `Get Streams` и при изменении stream ID обновлять channel/user metadata. HLS probe всё равно остаётся гостевым, потому что Helix не отдаёт ingest health или состояние CDN-плейлиста.

Практическое ограничение desktop/local-only продукта: client secret нельзя безопасно зашить в распространяемый binary. Варианты:

- пользователь регистрирует своё Twitch application и вводит Client ID + Client Secret;
- CommRelay использует только Client ID и user device-code OAuth, если позже появится реальная причина для user token;
- общий backend для хранения секрета противоречит принципу local-only и не рекомендуется.

App token надо перевыпускать после истечения. Twitch отдельно требует валидировать поддерживаемые OAuth-сессии; секреты и токены нельзя логировать или возвращать через config API.

### Twitch User OAuth

Для базовой диагностики user OAuth почти ничего не добавляет к Helix App + guest HLS. Он оправдан, если нужны:

- EventSub через WebSocket для `stream.online`, `stream.offline`, `channel.update` без публичного webhook callback;
- follower/subscription/goals/ads/moderation данные с минимально необходимыми scopes;
- отправка сообщений или действия от имени пользователя.

EventSub WebSocket требует user access token; webhook transport использует app access token. Для CommRelay polling `Get Streams` раз в 30–60 секунд проще и надёжнее до появления требования к мгновенным событиям.

Не следует запрашивать широкие scopes ради «возможного будущего»: Twitch требует использовать только scopes, необходимые текущей функции. Owner OAuth также не открывает официальный аналог YouTube `liveStreams.status.healthStatus`.

### Рекомендация по Twitch

1. Начать с изолированного guest adapter: GraphQL metadata + HLS manifest + официальный status page.
2. Помечать все guest capabilities как `best_effort` и иметь независимый `probe_error`.
3. Добавить Twitch App как предпочтительный официальный источник viewer count/metadata; при наличии credentials не использовать GraphQL для этих полей.
4. Оставить guest HLS probe даже в App mode.
5. Не добавлять user OAuth, пока не требуется EventSub WebSocket или owner-only функция.

## YouTube

### Текущее состояние CommRelay

В приложении уже есть два режима: `page` и `api`, см. [`internal/config/youtube.go`](../../internal/config/youtube.go). Page mode разрешает `/@handle/live`, разбирает публичные данные страницы и читает чат через InnerTube. API mode использует OAuth scope `youtube.readonly`: [`internal/connector/youtube/oauth_config.go`](../../internal/connector/youtube/oauth_config.go).

### YouTube Guest / Page mode

Публичная live page и встроенный JSON веб-плеера позволяют best-effort получить:

- video ID и channel identity;
- title;
- `isLive`, upcoming/ended/playability state;
- фактическое или запланированное время начала, если оно опубликовано;
- текущих concurrent viewers из `videoViewCountRenderer.originalViewCount`, если счётчик не скрыт;
- `playabilityStatus` и публичную причину недоступности;
- thumbnail и часть общедоступных метаданных.

InnerTube live chat дополнительно даёт:

- сообщения и системные события;
- автора, аватар, badges/roles;
- Super Chat/Super Sticker/membership events, когда они присутствуют;
- continuation/polling timeout;
- собственную диагностику: время последнего успешного continuation, message rate, reconnect/error rate.

Преимущества: нет Google Cloud project, quota и consent screen. Недостатки: HTML/JSON и InnerTube не документированы, возможны CAPTCHA, rate limit, гео/возрастные ограничения и изменения client context.

#### Viewer-side playback в guest mode

Страница иногда содержит `streamingData.hlsManifestUrl` и format ladder. Если HLS URL реально получен, можно сделать такой же manifest-only probe, как для Twitch/VK. Но YouTube чаще требует актуальный player JavaScript, signature deciphering, visitor data или Proof-of-Origin token. В проверке 2026-08-16 публичная live page была playable и показывала зрителей, а простой прямой запрос к InnerTube player вернул `UNPLAYABLE`.

Следствие: в первом guest MVP считать качеством YouTube только:

- live/playability status страницы;
- свежесть метаданных;
- здоровье live chat transport;
- HLS probe — только как optional capability, если manifest уже доступен без обхода challenge.

Не стоит превращать CommRelay в полноценный youtube-dl/player extractor: это большая и постоянно меняющаяся подсистема, не соответствующая основной задаче чата.

### YouTube API key — полезный промежуточный режим

Между guest page и OAuth есть официальный вариант без входа стримера: YouTube Data API с API key. Для известного публичного video ID метод `videos.list(part=snippet,statistics,liveStreamingDetails,status)` возвращает:

- title, channel ID/title, category, thumbnails;
- scheduled/actual start и actual end;
- `concurrentViewers`, пока эфир идёт и владелец не скрыл счётчик;
- `activeLiveChatId`;
- view/like statistics;
- privacy/embeddable и другие публичные status fields.

`videos.list` стоит 1 quota unit. API key не даёт `mine=true` для поиска собственных broadcast/stream и не даёт ingest health. Для поиска активного видео по каналу `search.list` имеет отдельные ограничения/квоту; поэтому выгоднее оставить текущий page resolver `/@handle/live`, а официальный `videos.list` использовать после получения video ID.

Как и Twitch secret, общий API key в desktop binary легко извлечь и использовать вне CommRelay. Рекомендуемый вариант — необязательный пользовательский ключ Google project с ограничениями API. Если ключа нет, остаётся page adapter.

### YouTube OAuth владельца

Это самый ценный авторизованный режим для диагностики.

#### `liveBroadcasts.list`

Для собственных трансляций доступны:

- lifecycle status broadcast;
- scheduled/actual start/end;
- privacy и recording status;
- title/description;
- active live chat ID;
- bound stream ID;
- latency preference, DVR, auto-start/auto-stop, recording и другие content settings.

#### `liveStreams.list(part=status,cdn,snippet,contentDetails,mine=true)`

Это официальный источник ingest diagnostics:

- `streamStatus`: `active`, `created`, `error`, `inactive`, `ready`;
- `healthStatus.status`: `good`, `ok`, `bad`, `noData`;
- `lastUpdateTimeSeconds`;
- `configurationIssues[]` с severity, reason и description;
- configured ingestion type, resolution и frame rate;
- reusable/bound stream metadata.

Среди configuration issues встречаются низкий/высокий bitrate, несовпадение frame rate или resolution, отсутствие audio/video, неподдерживаемый codec, multiple audio/video streams и проблемы keyframe interval. Точные `reason` следует сохранять как platform code, а пользователю показывать `description` и нормализованную severity.

Текущего scope `https://www.googleapis.com/auth/youtube.readonly` достаточно для `liveStreams.list`; не нужно переходить на write scopes. Секреты, access и refresh tokens уже должны оставаться только в backend/config и не попадать в публичную конфигурацию.

#### Live chat API

Официальный `liveChatMessages.streamList` даёт server-streaming low-latency delivery; `list` возвращает `pollingIntervalMillis`, `nextPageToken` и `offlineAt`. Это полезно для отдельного chat health, но не является видео-health.

#### YouTube Analytics — позднее расширение

Для владельца YouTube Analytics API может дать `averageConcurrentViewers`, `peakConcurrentViewers`, views, watch time, average view duration и minute-level concurrent viewer report. Это больше подходит для post-stream отчёта или сверки локальных замеров, чем для оперативного алерта. Для Analytics следует запросить отдельный минимальный scope только при реализации этой функции.

### Рекомендация по YouTube

1. Сразу дополнить Page mode публичными viewers/state/start/title и freshness.
2. Добавить optional API-key adapter для официального `videos.list`, используя уже найденный video ID.
3. В текущем OAuth mode добавить `liveBroadcasts.list` + `liveStreams.list(status,cdn,...)` и показывать ingest issues.
4. Не делать guest HLS extraction обязательной зависимостью MVP.
5. Analytics вынести в отдельную post-stream фазу.

## VK Видео Live

### Текущее состояние CommRelay

Connector уже использует публичный read-only WebSocket API веб-клиента и подписывается на chat channel. Текущий подход описан в [`docs/concept.md`](../concept.md), реализация — в [`internal/connector/vk`](../../internal/connector/vk).

### VK Guest

Публичный endpoint:

```text
GET https://api.live.vkvideo.ru/v1/blog/{slug}/public_video_stream
```

В проверке активного и запланированного канала 2026-08-16 он отдавал без входа:

- `id`, `title`;
- `isOnline`, `isEnded`, `isCreated`, `isPlaybackDisabled`;
- `createdAt`, `startTime`, `plannedAt`, `plannedEndAt`, `endTime`;
- category ID/title/type;
- preview и embed URL;
- `count.viewers`, `count.views`, `count.likes`;
- `count.sources[]` с viewers/views отдельно для `live.vkvideo.ru`, `vkvideo.ru`, `vk.ru`;
- owner/channel metadata;
- public WebSocket channels для stream info, viewers и chat;
- `data[].width/height` и временные HLS/DASH playback URL.

На активном канале endpoint вернул суммарных viewers и разбивку по трём источникам. HLS master playlist открывался без авторизации и содержал варианты 720p60, 480p60 и 240p60. Поэтому guest VK monitor может получать одновременно metadata, viewer count и viewer-side playback diagnostics.

Полезные проверки:

- polling `public_video_stream` для state/viewers/title/category;
- подписка на `channel-info:{owner_id}` для start/stop/settings events;
- подписка на `channel-viewers:{owner_id}` для более быстрых viewer updates, если формат стабильно подтверждён тестами;
- HLS master для resolution/FPS/bandwidth ladder;
- media playlist для sequence advancement и задержки;
- существующий `channel-chat:{owner_id}` для chat health.

Endpoint `.../public_video_stream/chat/user/` отдаёт owner, moderators, users и `count.users`. Это число пользователей, видимых в чате, а не число зрителей. Для аудитории надо использовать только `public_video_stream.count.viewers`.

Ограничения:

- endpoint и WebSocket contract используются публичным web player, но не документированы как стабильный guest API;
- playback URL подписаны, привязаны к условиям выдачи и истекают;
- `count.sources` может меняться при интеграции с другими поверхностями VK;
- пустой `data` у offline/upcoming эфира нормален;
- нельзя публиковать playback URL через CommRelay API или сохранять их в историю.

### VK registered application / grants

На `https://dev.live.vkvideo.ru/` существует кабинет приложений и публичный API с API key. Публичная конфигурация кабинета на дату проверки перечисляла webhook events:

- `channel_stream_start`, `channel_stream_stop`;
- `channel_stream_pause`, `channel_stream_resume`;
- `channel_stream_settings_change`;
- создание/изменение/удаление записи;
- follow/subscription/gift/renew events;
- channel points reward demand;
- incoming raid;
- ping events для app/user grants.

Это может дать событийное обновление lifecycle вместо частого polling и в будущем — интеграцию с подписками, наградами или рейдами.

Однако на 2026-08-16 раздел документации кабинета возвращал ошибку загрузки, поэтому по открытым материалам нельзя надёжно подтвердить:

- точные HTTP methods и response schemas;
- способ подписи/проверки webhook;
- rate limits;
- какие методы требуют только API key, app grant или user grant;
- наличие owner-only ingest health;
- наличие дополнительных real-time quality metrics.

Поэтому registered app нельзя обещать как источник качества до отдельного spike с созданным приложением и доступной документацией. Даже после app-интеграции публичный `public_video_stream` остаётся достаточным источником viewers/metadata/playback, а hooks — дополнительным ускорителем событий.

### Рекомендация по VK

1. Расширить текущий guest connector запросом `public_video_stream`.
2. Использовать `count.viewers`, никогда не `chat.user.count.users`.
3. Добавить manifest-only HLS probe с короткоживущими URL только в памяти.
4. Подписки `channel-info` и `channel-viewers` вводить после записи fixtures живого эфира и тестов формата; polling должен оставаться fallback.
5. VK App вынести в отдельный research/spike после восстановления официальной документации и регистрации тестового приложения.

## Что полезно собирать кроме текущих зрителей

### Оперативные данные

- platform state и причина `unknown/degraded`;
- stream ID, чтобы отличать новый эфир от reconnect того же эфира;
- title/category/language;
- scheduled/actual start, duration;
- current viewers по платформе и общий cross-platform total;
- локальный peak/average/min за текущую сессию;
- изменение viewers за 1/5/15 минут;
- время последнего успешного sample;
- возраст данных (`stale_after`), чтобы старое число не выглядело актуальным;
- chat connection state, last message/event и message rate;
- platform incident отдельно от channel state.

Cross-platform total — это сумма platform-reported concurrent sessions, а не число уникальных людей: один зритель может одновременно открыть несколько площадок. Платформы также используют разные правила подсчёта и частоту обновления, поэтому значения нельзя сравнивать как синхронные лабораторные измерения. В UI лучше подписать агрегат как «суммарно на платформах», а не «уникальных зрителей».

### Viewer-side playback

- manifest reachable;
- manifest response latency;
- media sequence advancing;
- program-date-time lag, если тег присутствует;
- resolution/FPS/bandwidth variants;
- max advertised resolution/FPS;
- source variant present;
- consecutive failure/success count.

Не следует скачивать TS/fMP4 segments: это тратит трафик, может влиять на viewer accounting и для детектора зависания не требуется.

### Owner-only ingest

На первом этапе доступен только для YouTube OAuth:

- stream receiving/not receiving;
- health status;
- configuration issue codes/severity/descriptions;
- last platform health update;
- configured ingest protocol/resolution/frame rate.

### История и post-stream

- peak/average concurrent viewers по локальным samples;
- время online/degraded/offline переходов;
- длительность manifest stalls;
- число connector/probe reconnects;
- экспорт диагностического snapshot для issue report;
- позже — official YouTube Analytics и аналогичные owner analytics, если появится реальная потребность.

## Рекомендуемая модель данных

Диагностика потока должна быть отдельна от унифицированного `ChatMessage`. Предлагаемый нормализованный snapshot:

```json
{
  "platform": "youtube",
  "mode": "oauth",
  "capabilities": [
    "stream_metadata",
    "viewers",
    "chat_health",
    "ingest_health"
  ],
  "stream_id": "video-id",
  "state": "degraded",
  "title": "Stream title",
  "category": "Gaming",
  "scheduled_at": null,
  "started_at": "2026-08-16T17:00:00Z",
  "sampled_at": "2026-08-16T18:04:30Z",
  "viewers": {
    "current": 1542,
    "peak_session": 1804,
    "change_5m": 37
  },
  "chat": {
    "state": "connected",
    "last_success_at": "2026-08-16T18:04:28Z",
    "messages_per_minute": 21.5
  },
  "playback": {
    "supported": false,
    "state": "not_checked",
    "manifest_advancing": null,
    "lag_seconds": null,
    "max_resolution": null,
    "max_fps": null,
    "checked_at": null
  },
  "ingest": {
    "supported": true,
    "state": "warning",
    "issues": [
      {
        "code": "videoBitrateLow",
        "severity": "warning",
        "message": "Platform-provided description"
      }
    ],
    "checked_at": "2026-08-16T18:04:25Z"
  },
  "probe": {
    "source": "youtube_live_streams_api",
    "last_success_at": "2026-08-16T18:04:30Z",
    "consecutive_failures": 0,
    "last_error": null
  }
}
```

В Go числовые поля, которые могут отсутствовать, должны быть nullable/pointer. `0 viewers` и `viewers unknown` — разные состояния. Platform-specific payload не следует протаскивать в overlay; при необходимости можно хранить ограниченный `details` только для admin diagnostics.

Рекомендуемые capabilities:

- `stream_metadata`;
- `viewers`;
- `viewer_sources`;
- `chat_health`;
- `playback_probe`;
- `ingest_health`;
- `platform_status`;
- `owner_analytics`.

UI должен строиться по capabilities, а не по цепочке `if platform == ...`.

## Архитектурные рекомендации для CommRelay

### Разделить chat connector и stream monitor

Chat reconnect и состояние видео имеют разные причины и частоту обновления. Рекомендуемая структура:

```text
internal/
  streamstatus/             # нормализованные snapshot, history, aggregation
  streamprobe/              # безопасный HLS manifest-only probe
  connector/
    twitch/monitor.go       # guest/helix adapters
    youtube/monitor.go      # page/key/oauth adapters
    vk/monitor.go           # public stream adapter
```

Monitor может переиспользовать platform client и config connector-а, но не должен менять `ChatMessage` или останавливать чат при своей ошибке.

### API

Следовать текущим API conventions:

- `GET /api/streams/status` — нормализованные текущие snapshots и агрегат;
- `POST /api/streams/probe` — ручной refresh/probe, если он вообще нужен;
- текущий `GET /api/diagnostics` может содержать компактную сводку, но не всю историю;
- для live UI — отдельное событие `stream_status` или отдельный diagnostics WebSocket, чтобы overlay чата не зависел от телеметрии.

Не возвращать из API access tokens, client secrets, signed HLS/DASH URL, полный raw platform response или внутренние сетевые ошибки с чувствительными query parameters.

### Частота запросов и устойчивость

Стартовые значения:

| Проверка | Интервал live | Интервал offline/upcoming |
|---|---:|---:|
| Viewer count/metadata | 30 секунд | 60–120 секунд |
| HLS media playlist | 10–15 секунд | выключено |
| HLS master ladder | при новом stream ID, затем 5 минут | выключено |
| Twitch global status | 60–300 секунд | 60–300 секунд |
| YouTube OAuth ingest health | 15–30 секунд | 30–60 секунд |
| UI broadcast | только при изменении или раз в 30 секунд | только при изменении |

Обязательны jitter, exponential backoff, response size limits и platform-specific timeouts. Чтобы не мигать при единичной ошибке:

- переход в degraded после 3 последовательных failures;
- восстановление после 2 successes;
- offline выставлять только по достоверному platform state, а не по timeout;
- при ошибке источника сохранять последнее значение, но отмечать его stale.

### История

Для MVP достаточно кольцевого буфера в памяти на 30–60 минут с шагом 30 секунд. Он даёт тренд и session peak без базы данных. Персистентную историю стоит добавлять только вместе с понятным post-stream UI/export и политикой retention.

Локальные peak/average считаются по samples CommRelay и могут отличаться от обработанной аналитики платформы. В модели и экспорте источник должен быть явным: `local_samples`, `platform_realtime` или `platform_analytics`.

### Отображение в единой OBS-панели

Отдельная копия OBS Stats не нужна. Полезнее компактная platform strip в существующем dock/admin UI:

```text
Twitch  4 812  LIVE  playback OK
YouTube 1 542  LIVE  ingest warning: low bitrate
VK        286  LIVE  playback OK
TOTAL   6 640        updated 8s ago
```

Подробности раскрываются по клику. В обычном состоянии UI не должен привлекать внимание; заметными должны быть только:

- stale/unknown;
- ingest error/warning;
- manifest stalled;
- platform incident;
- резкий переход live → offline.

Нужно дать пользователю отключить HLS probe по платформе, особенно при proxy или ограниченном трафике.

## План доработок

### Этап 1 — Guest MVP

Общий фундамент:

- `streamstatus.Snapshot`, capability flags и in-memory history;
- независимые `metadata`, `chat`, `playback`, `ingest`, `platform` состояния;
- `GET /api/streams/status`;
- platform strip и meaningful alerts;
- redaction signed URL и безопасные ошибки.

Платформы:

- Twitch: guest GraphQL viewers/metadata, anonymous HLS probe, Twitch Status;
- YouTube: расширить page parser viewers/state/start/playability, chat health; HLS только при легко доступном manifest;
- VK: `public_video_stream` viewers/metadata/source breakdown + HLS probe; polling как основной путь.

Критерии готовности:

- ошибка одного monitor-а не влияет на чат и другие платформы;
- `0` не используется вместо unknown;
- timeout не превращается в offline;
- stale data явно помечаются;
- signed URLs и platform tokens отсутствуют в API/logs;
- есть fixtures и тесты live/offline/upcoming/malformed responses.

### Этап 2 — Официальные app credentials без consent стримера

- Twitch App: client credentials, Helix `Get Streams` как preferred metadata source, token renewal;
- YouTube API key: `videos.list` как preferred public metadata source после page resolution video ID;
- fallback на guest adapters при отсутствии credentials, но не при auth/config error без явной диагностики;
- admin показывает effective mode и capabilities.

### Этап 3 — Owner OAuth

- YouTube: `liveBroadcasts.list` + `liveStreams.list(status,cdn,...)`, ingest issue mapping;
- сохранить текущий минимальный `youtube.readonly` scope;
- Twitch user OAuth только если выбран EventSub WebSocket или конкретные owner metrics;
- VK App spike: зарегистрировать тестовое приложение, зафиксировать docs/schema/auth/webhook verification и лишь затем планировать реализацию.

### Этап 4 — История и отчёты

- сохранение session summary;
- экспорт diagnostics bundle без секретов;
- YouTube Analytics peak/average/watch time;
- настраиваемые alerts и thresholds;
- сравнение platform-reported metrics с локальными samples.

## Риски и меры защиты

| Риск | Мера |
|---|---|
| Недокументированный guest API изменился | Изолированные adapters, fixtures, capability unavailable вместо crash/offline |
| Rate limit/CAPTCHA | Медленный polling, jitter/backoff, ETag где доступен, proxy-aware errors |
| Общий client secret/key украден из binary | Не встраивать секреты; user-supplied credentials или user OAuth |
| Signed playback URL утёк в log/API | Хранить только в памяти, redaction query/path, никогда не сериализовать |
| Probe создаёт лишний трафик | Только manifests, без media segments, выключаемый режим |
| Локальная сеть принята за сбой платформы | Раздельные probe/platform/ingest states и точные тексты |
| Старое число зрителей выглядит актуальным | `sampled_at`, `last_success_at`, stale threshold, nullable value |
| Частые колебания статуса | Hysteresis по failures/successes |
| Сбор лишних пользовательских данных | Не хранить viewer identities/chat user lists для stream diagnostics |

Перед выпуском guest adapters следует отдельно проверить актуальные platform terms для распространяемого приложения. Недокументированный endpoint, доступный браузеру без входа, технически публичен, но это не делает его официально поддерживаемым API. Каждый такой adapter должен отключаться конфигурацией и иметь официальный replacement path там, где он существует.

## Источники

Источники проверены 2026-08-16.

### Twitch

- Authentication: <https://dev.twitch.tv/docs/authentication>
- Registering an application: <https://dev.twitch.tv/docs/authentication/register-app>
- OAuth token flows: <https://dev.twitch.tv/docs/authentication/getting-tokens-oauth>
- Token validation: <https://dev.twitch.tv/docs/authentication/validate-tokens>
- Helix API reference, включая Get Streams: <https://dev.twitch.tv/docs/api/reference#get-streams>
- IRC concepts: <https://dev.twitch.tv/docs/chat/irc/>
- EventSub WebSocket: <https://dev.twitch.tv/docs/eventsub/handling-websocket-events>
- EventSub subscription authorization: <https://dev.twitch.tv/docs/eventsub/manage-subscriptions/>
- Twitch Status API: <https://status.twitch.com/api>
- Streamlink Twitch adapter как практический reference недокументированного playback flow: <https://github.com/streamlink/streamlink/blob/master/src/streamlink/plugins/twitch.py>

### YouTube

- Videos resource (`liveStreamingDetails.concurrentViewers`): <https://developers.google.com/youtube/v3/docs/videos>
- `videos.list`: <https://developers.google.com/youtube/v3/docs/videos/list>
- LiveBroadcasts resource: <https://developers.google.com/youtube/v3/live/docs/liveBroadcasts>
- LiveStreams resource и ingest health: <https://developers.google.com/youtube/v3/live/docs/liveStreams>
- `liveStreams.list` и scopes: <https://developers.google.com/youtube/v3/live/docs/liveStreams/list>
- LiveChatMessages resource: <https://developers.google.com/youtube/v3/live/docs/liveChatMessages>
- `liveChatMessages.list`: <https://developers.google.com/youtube/v3/live/docs/liveChatMessages/list>
- Live Streaming API authentication: <https://developers.google.com/youtube/v3/live/authentication>
- Installed app OAuth: <https://developers.google.com/youtube/v3/guides/auth/installed-apps>
- Quota calculator: <https://developers.google.com/youtube/v3/determine_quota_cost>
- YouTube Analytics livestream metrics: <https://developers.google.com/youtube/analytics/metrics>
- Concurrent viewers report: <https://developers.google.com/youtube/analytics/channel_reports>
- yt-dlp YouTube extractor как практический reference недокументированного page/player flow: <https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/youtube/_video.py>

### VK Видео Live

- Кабинет разработчика и условия Public API: <https://dev.live.vkvideo.ru/>
- Публичный stream endpoint: <https://api.live.vkvideo.ru/v1/blog/mechastrider/public_video_stream>
- Публичный channel endpoint: <https://api.live.vkvideo.ru/v1/blog/mechastrider>
- Публичный chat users endpoint: <https://api.live.vkvideo.ru/v1/blog/mechastrider/public_video_stream/chat/user/>

VK endpoint-ы выше приведены как воспроизводимые примеры текущего web API, а не как обещание стабильного официального контракта. Поля активного эфира проверялись также на живом канале; конкретный канал и подписанные playback URL намеренно не фиксируются в документе.
