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
- Bullets: streamer impact in one line each. Group related items in one bullet when the 0.3 pattern would (see example).
- Footer: always the Telegram group, then the GitHub Releases URL. Do not drop either.
- If the user pastes a previous post, keep its layout and only update version, hook, and bullets.

Say the Telegram group was *just created* only when that is actually the news of this release. Otherwise use the standing footer line above.

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

Do not hype. No emoji unless the user asks. No English dump of the changelog.

## Canonical links

- Releases: `https://github.com/mechastrider/comm-relay/releases`
- App feedback Telegram: `https://t.me/mechastrider_apps/2`

## Example (v0.3.0 — canonical pattern)

```text
Новый релиз CommRelay v0.3.0 — больше удобства для OBS.

- Browser Dock — живая лента чата прямо в интерфейсе OBS рядом со стримом, а не в отдельном окне
- OBS Setup в админке — готовые URL, копирование, пошаговое подключение
- Превью overlay с тестовыми сообщениями
- Темы MW5 Mercs (Cockpit panel / popups)
- Восстановление история чата после обновления Browser Source, удаление сообщений, выбор часового пояса

Скачать релиз: https://github.com/mechastrider/comm-relay/releases
```

v0.3 predates the Telegram footer; new posts always include it.

## Example (v0.4.0)

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
