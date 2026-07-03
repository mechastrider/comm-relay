---
name: closeout
description: End-of-session retrospective from chat transcript and agentmem MCP capture. Invoke manually with @closeout when finishing non-trivial work.
---

# Closeout

Run this skill **manually** when a session is done — invoke `@closeout` or ask the agent to run the closeout skill.

Works in Cursor IDE and Cloud Agent (no project hooks required). Reads the session transcript for a full retrospective, then writes evidence to agentmem via MCP.

Principle: *Capture freely. Retrieve cautiously. Promote deliberately.*

## When to run

| Run closeout | Skip |
| ------------ | ---- |
| Code/docs/config changed | One-line question with no lesson |
| User confirmed a design or workflow | Pure read-only exploration |
| Multiple tool-heavy turns | Trivial typo with no reusable lesson |
| Security or config decisions | MCP unavailable — report to user, do not pretend events were recorded |

## Invocation

Default prompt (adapt `projectId` for client repos):

```text
@closeout for muonsoft/agentmem
```

Optional: user may name a specific conversation or paste a transcript path.

## Procedure

### 1. Resolve project

- Default for this repo: `projectId: "muonsoft/agentmem"`.
- Client repos: `projectId` slug (`owner/repo`) or `repoUrl` from git remote.

### 2. Check MCP

Confirm **agentmem MCP** is available (`user-agentmem` or `agentmem` server).

If available, optionally call `memory.get_context_pack` with a mode matching the session (`implement`, `review`, `debug`, etc.) to see what active memory already covers — avoids duplicate drafts.

If MCP fails, stop after the retrospective summary and tell the user memory capture is offline.

### 3. Read the session transcript

Primary source of truth for what actually happened (not just the latest assistant message).

**Transcript location (Cursor):**

```text
~/.cursor/projects/<workspace-slug>/agent-transcripts/<conversation-id>/<conversation-id>.jsonl
```

**How to find it:**

1. If the user or environment provides `transcript_path` / `conversation_id`, use that file.
2. Otherwise list `~/.cursor/projects/*/agent-transcripts/*/*.jsonl` and pick the most recently modified file for the current workspace, or the file whose early user messages match this chat.
3. If no transcript is readable (Cloud Agent without path access), fall back to messages visible in the current conversation only — note the limitation in your summary.

**How to read:**

- JSONL: one JSON object per line; `role` is `user` or `assistant`.
- Scan for: user goals, decisions, errors, fixes, files changed, security issues, disagreements, MCP failures.
- Do **not** replay every tool call; focus on outcomes and lessons.
- Do **not** copy secrets (tokens, keys, `.env` values) into events or drafts — redact.

### 4. Retrospective

Produce internally, then show the user a **brief** summary:

1. **Done** — 3–5 outcome bullets.
2. **Went well** — decisions, patterns, workflows worth repeating.
3. **Went poorly** — mistakes, regressions, false assumptions, missed captures.
4. **Noise** — routine passes (formatting, obvious test green) with no reusable lesson → do not record.

### 5. Write to agentmem

| Situation | `memory.record_event` type | Also `memory.propose_entry`? |
| --------- | -------------------------- | ---------------------------- |
| User explicitly chose/approved a direction | `decision_confirmed` | Yes if reusable |
| Reusable implementation/review pattern verified | `pattern_validated` | Yes if durable |
| Command/check sequence validated for releases | `workflow_validated` | Optional |
| General confirmed success, not yet a rule | `positive_outcome` | Optional |
| Bug/regression/invalid assumption / security issue | `check_failed` | Yes if project-wide lesson |
| Retrieved memory was wrong/outdated | `memory.record_feedback` | No |
| Routine work, no lesson | **Nothing** | No |

Use **one or more** `memory.record_event` calls when multiple distinct lessons deserve separate evidence. Prefer a single closeout event with structured `details` when lessons are one narrative.

Every closeout capture MUST include tag `closeout` and a structured **`sessionDigest`** inside `details` (concept v2). Target ~500–800 words total across digest fields; no tool-call replay; redact secrets.

Trust model: events are **evidence only**; `propose_entry` creates **draft**; humans approve **active** memory.

#### Event payload shape

```json
{
  "eventType": "pattern_validated",
  "projectId": "muonsoft/agentmem",
  "summary": "Short factual summary",
  "topic": "workflow",
  "severity": "low",
  "details": {
    "sessionDigest": {
      "goal": "What the session tried to accomplish",
      "outcome": "What actually shipped or was decided",
      "keyDecisions": ["Important choices made"],
      "mistakes": ["Regressions or false assumptions"],
      "openQuestions": ["Unresolved items for follow-up"]
    },
    "wentWell": ["bullet"],
    "wentPoorly": ["bullet"],
    "done": ["outcome bullet"],
    "skipped": ["routine noise"]
  },
  "evidence": [{ "kind": "file", "uri": "path/from/repo/root" }],
  "tags": ["closeout", "workflow"],
  "agentClient": "cursor"
}
```

`sessionDigest` fields are required for closeout events. `wentWell` and `wentPoorly` remain alongside the digest for quick scanning.

#### Draft memory (`memory.propose_entry`)

Propose when the lesson should guide **future** agents:

- Title: imperative, specific.
- Body: what to do, what to avoid, where documented — no generic praise.
- `suggestedStatus`: always `draft`.
- Reuse the same `evidence` array as the event when possible.

### 6. Report to user

End with:

- What was recorded (event types + summaries) or explicitly that nothing met the bar.
- Draft titles proposed, if any.
- Whether transcript was fully read or fallback was used.
- Reminder: drafts need human approval in `/memory/entries`.

## Checklist

- [ ] Transcript (or conversation fallback) reviewed
- [ ] Retrospective: done / well / poorly / noise
- [ ] `memory.record_event` with `closeout` tag and `sessionDigest` for worthwhile evidence
- [ ] `memory.propose_entry` for durable rules
- [ ] `memory.record_feedback` if context pack misled you
- [ ] User briefed; no secrets in captured text

## Insurance

Scheduled **Cursor Automation** with `memory-curation` can backfill when closeout was skipped — see [session-closeout-automation.md](../../../docs/agent-memory/session-closeout-automation.md).

## Related skills

- `agent-memory-usage` — MCP usage and positive outcome types in client repos
- `memory-curation` — batch curation from accumulated events
