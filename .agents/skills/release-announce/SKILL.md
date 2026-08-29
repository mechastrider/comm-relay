---
name: release-announce
description: Writes short Russian social-media posts for CommRelay releases. Use when the user asks for an анонс, announcement, Telegram/VK/Twitter post, or social copy for a version.
---

# Release announce

Write the post for streamers and OBS operators, not maintainers. Source of truth is `CHANGELOG.md` (the named version, or `[Unreleased]` if the version is not tagged yet). Do not invent features.

Use together with `changelog` for what counts as user-visible. Do not paste changelog sections, file paths, or migration notes into the post.

## Output shape

Russian. One post, ready to copy. Match this pattern:

```text
Новый релиз CommRelay vX.Y.Z — [one-line benefit for the streamer].

- [4–6 bullets]

Обратная связь по приложениям — отдельная группа в Telegram: https://t.me/mechastrider_apps/2

Скачать релиз: https://github.com/mechastrider/comm-relay/releases
```

- Headline: `Новый релиз CommRelay vX.Y.Z` plus an em dash and a short hook (what got easier or more useful). Use the `v` prefix.
- Bullets: one friendly sentence each about **what this means on stream or in OBS**. Group related changelog items when they serve the same outcome.
- Footer: always the Telegram group, then the GitHub Releases URL. Do not drop either.
- If the user pastes a previous post, keep its layout and only update version, hook, and bullets.

Say the Telegram group was *just created* only when that is actually the news of this release. Otherwise use the standing footer line above.

## Tone

Write as if talking to a streamer, not documenting a release notes file.

- **Meaning first.** Each bullet answers “what can I do now?” or “what got easier?”, not “which control appeared where?”.
- **Friendly, not dry.** Spoken Russian, “можно / сохраняйте / проще”, one concrete scene when it helps (геймплей vs пауза). Noun stacks and admin inventories feel like a changelog dump.
- **Still honest.** No hype, no emoji unless the user asks, no invented use cases. A concrete scene must follow from the change.

## What to pick

From the changelog, keep only what a streamer would notice without opening the repo. Prefer new OBS/admin capabilities, connector setup that got simpler, new overlay themes, and language/locale of the UI.

Skip: refactors, tests, lint, internal names, `config.json` keys, OAuth/InnerTube internals, bugfixes unless the user would have hit them on stream (then one short bullet, in user language).

Cap at **six** bullets. If there are more, merge or drop the weakest.

## Wording

Plain streamer language. If a term would need a tooltip, replace it.

| Avoid | Prefer |
|-------|--------|
| handle, `@name`, channel ID | имя канала или ссылка |
| Simple / API mode, InnerTube, OAuth (bare) | без Google Cloud; вход Google в системном браузере |
| SOCKS5 as a heading with no context | SOCKS5-прокси для YouTube и VK Live |
| dock URL paths, `config.json` | OBS dock, админка — only if the user must open that place |
| вкладки, CRUD-кнопки, все значения масштаба | что это даёт на стриме |
| сухой пересказ changelog | живая формулировка и зачем это нужно |

Do not hype. No emoji unless the user asks. No English dump of the changelog.

## Canonical links

- Releases: `https://github.com/mechastrider/comm-relay/releases`
- App feedback Telegram: `https://t.me/mechastrider_apps/2`

## Example (v0.5.0 — canonical tone)

This is the target voice. Prefer it over older posts.

```text
Новый релиз CommRelay v0.5.0 — чат может выглядеть по-разному в разных сценах OBS.

- Сохраняйте несколько вариантов overlay и подключайте нужный к каждой сцене: один вид на геймплей, другой — на паузу или интервью
- На панель чата можно поставить свою картинку и выбрать, как она ляжет и к чему привяжется — к сообщению или ко всей колонке
- В превью проще проверить читаемость: белый фон, шахматка, игровой кадр или чёрный; темы MW5 и G-Rebels заполняют весь прямоугольник
- Иконка платформы стоит сразу перед ником — сразу видно, откуда пришло сообщение

Обратная связь по приложениям — отдельная группа в Telegram: https://t.me/mechastrider_apps/2

Скачать релиз: https://github.com/mechastrider/comm-relay/releases
```

Same facts, **too dry** (do not write like this):

```text
- Пресеты overlay: отдельный вид для каждой сцены; URL и выбор пресета на вкладке Подключение, на Внешний вид — список, новый / переименовать / дублировать / удалить
- Картинка панели: масштаб (заполнить / вписать / растянуть / плитка) и привязка к сообщению или к колонке чата
```

## Example (v0.3.0 — older layout)

Layout only. Tone is drier than v0.5; do not copy the voice. Predates the Telegram footer; new posts always include it.

```text
Новый релиз CommRelay v0.3.0 — больше удобства для OBS.

- Browser Dock — живая лента чата прямо в интерфейсе OBS рядом со стримом, а не в отдельном окне
- OBS Setup в админке — готовые URL, копирование, пошаговое подключение
- Превью overlay с тестовыми сообщениями
- Темы MW5 Mercs (Cockpit panel / popups)
- Восстановление история чата после обновления Browser Source, удаление сообщений, выбор часового пояса

Скачать релиз: https://github.com/mechastrider/comm-relay/releases
```

## Example (v0.4.0)

Standing footer is the default. Use the “создана отдельная группа” line only when the group itself is the news of that release.

```text
Новый релиз CommRelay v0.4.0 — проще YouTube, удобнее панель.

- YouTube Simple по умолчанию — достаточно имени канала или ссылки, без Google Cloud
- Язык интерфейса RU/EN в админке и OBS dock
- Connections по вкладкам (Twitch, YouTube, VK Live, Network); вход Google для API открывается в системном браузере
- SOCKS5-прокси для YouTube и VK Live
- Тема overlay G-Rebels Cockpit popups, окно «О программе» и FAQ по OBS

Для обратной связи по приложениям создана отдельная группа в Telegram: https://t.me/mechastrider_apps/2

Скачать релиз: https://github.com/mechastrider/comm-relay/releases
```
