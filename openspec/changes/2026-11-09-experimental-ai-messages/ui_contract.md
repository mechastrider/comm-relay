# Desktop UI Contract

## Windows / Views / Entry Points

| Surface | User goal | Entry/navigation | Platform differences |
|---|---|---|---|
| Settings → Experimental features | Enable feature explicitly | Existing settings navigation | Same browser/Wails UI |
| AI messages → Settings | Configure providers, policy, voices and limits | Visible when enabled or previously configured | Environment key reference help includes desktop-launch environment caveat |
| AI messages → Review / Recent | Review uncertain jobs and diagnose failures | Feature workspace, pending count badge | Same browser/Wails behavior |
| OBS alert | Hear/view approved phrase | Existing `/overlay/alert` | Existing OBS browser compatibility |
| Admin/dock chat row | See request status | Existing message row | No new dock view |

## Menus / Tray / Commands / Shortcuts

No native menu, tray, shortcut or new window. Experimental master switch remains reachable even when provider settings are broken. Explicit disable cancels AI work/playback.

## View / Flow: AI messages

### Layout and Components

Reuse existing React components/tokens. Settings sections: LLM, TTS, policy/context, characters/images, limits. Review list/detail uses a constrained layout with pinned actions and scrolling body. Recent jobs show state, timestamps, selected character, latency and known usage. Distinguish `dispatched` from `played`; never show a playback guarantee.

### Data / Forms / Actions

- Profile fields: preset, base URL, model, credential environment variable reference, output mode, timeout; ElevenLabs output format and character voice IDs.
- Secret values are never returned or editable in a normal text field; show configured/missing status and field-help dialog explaining environment configuration and restart requirements.
- Character rows: stable ID, label, short selection description, voice ID, delivery default; image rows select an existing alert command image with a situation description. Empty or dangling catalogs prevent enable.
- Show message/context transmission notice next to enable. Provide explicit paid connection test, clearly labeled as using provider quota, isolated from production OBS. Saving alone does not invoke providers.
- Review detail displays original, corrected display text, spoken text, image/character, moderation reason and expiry countdown. Approve/reject/cancel buttons have pending and stale states. No text editing in review v1; approval uses immutable revision.
- Recent jobs can be canceled while active. No one-click retry or replay. Clear history only removes terminal records and unreferenced generated media.
- Validation is inline and summarized; preserve unsaved values. Full-queue approval remains pending with a recoverable message. Errors use localized app wording, not raw upstream bodies.

### HTTP contract

Use existing `GET /api/config` / `POST /api/config/update` for settings; config response exposes references/status only. New POST-action endpoints:

| Endpoint | Input | Result |
|---|---|---|
| `GET /api/ai-messages` | `state`, `limit` (1–100), `before_id` query | bounded `{items, next_cursor, service_state}` |
| `POST /api/ai-messages/approve` | `{job_id, expected_revision}` | current job |
| `POST /api/ai-messages/reject` | `{job_id, expected_revision}` | current job |
| `POST /api/ai-messages/cancel` | `{job_id, expected_revision}` | current job |
| `POST /api/ai-messages/resume` | empty object | service state after local config checks; no paid retry |
| `POST /api/ai-messages/clear-history` | empty object | deleted terminal count |
| `POST /api/ai-messages/test` | `{profile: llm|tts}` | bounded test result; paid, no production dispatch |

Validation errors use existing config validation convention; malformed input 400, unknown job 404, stale/expired/capacity conflicts 409, disabled/unconfigured provider 503, unexpected failure 500. Preserve existing API error envelope. No path-ID mutations, DELETE/PATCH/PUT or secrets in URLs. List fields include ID/revision, state, original/display/spoken text, selected IDs, reason, deadlines, timings and nullable usage; no credentials/raw provider bodies. Admin/dock refresh statuses by bounded polling while visible; do not broadcast private moderation reasons to OBS audiences. OBS receives only final alert/cancellation frames.

### States and Recovery

| State | Required behavior |
|---|---|
| loading/busy | Skeleton initially; keep old rows visible on refresh; disable only affected action |
| empty | Explain no requests/reviews yet and show trigger example |
| error/retry | Show safe stage/error reason; settings repair permitted, no implicit paid retry |
| offline/degraded | Explain provider unavailable or budget pause; ordinary chat remains usable |
| permission denied | Explain unresolved credential or upstream auth failure; never display its value |
| interrupted/recovered | Show canceled after restart; refresh stale revisions without reapproval |
| review pending | Show exact result, reason and deadline; accessible pending count |
| expired | Disable actions and explain expiry |

## Accessibility / Keyboard / Focus

Label every input; native keyboard activation, visible focus, associated errors and live status region. Review approval/rejection returns focus to next item/list heading. No focus stealing when new jobs arrive. Dialogs restore focus, support Escape, and scroll at 200% zoom. Do not rely only on color for verdicts.

## Scaling / Theme / Localization / Reduced Motion

RU/EN locale keys, existing light/dark tokens. Test 100/150/200% scaling, narrow desktop window and long Russian reasons. OBS remains transparent; reduced motion preserves readable static content.

## Explicit Non-Goals

No chat replies, review editing, custom native notifications, new OBS dock or mandatory review of every message.

## Not applicable

Native window/menu changes are not applicable; all interaction uses the existing web shell.
