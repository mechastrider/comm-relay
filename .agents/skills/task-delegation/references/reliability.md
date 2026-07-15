# Reliability and executor behavior

The vendored `cursor-executor.mjs` is the operational source of truth for Cursor
CLI delegation. This reference summarizes behavior orchestrators should expect.

## Model pinning

- Spawn argv always includes `--model composer-2.5`.
- No public `--model` override; no silent fallback to another model or executor.
- Reported model from Cursor init telemetry is saved for diagnostics only and
  does not block jobs in v1.

## Job storage and exclusivity

- Jobs and logs live under
  `$XDG_STATE_HOME/agent-orchestration/jobs/<repo-hash>/`.
- One active **writer** job per repository (start/resume acquire an exclusive
  `writer.lock` file atomically).
- Concurrent start/resume is rejected without spawning Cursor.
- Crashed wrappers reconcile stale locks when the recorded process is dead,
  recover aged malformed locks, and mark orphaned running jobs `interrupted`.

## Lifecycle

- **Foreground** — block until terminal status; print JSON result.
- **Background** — return immediately; poll `status` / `result`.
- **Timeout** — public `--timeout` is seconds; terminate the process tree;
  record `timed_out`.
- **Cancel** — terminate the wrapper and child process trees; do not release a
  live writer lock.
- **Resume** — `resume --job <prior-job-id> --task <packet>` loads the saved
  Cursor session, validates a new task packet, links the new auditable job to the
  prior job, and passes `--resume <session>` with the pointer prompt.
- **Watchdog** — if stream-json emits a terminal `result` but the child hangs,
  force-terminate after a short interval and retain the result.

## Evidence and safety

- Job records: schema version, repo root, task path/content hash, models, session
  id, timestamps, status, exit code, summary, absolute stdout/stderr log paths,
  baseline dirty paths, post-run changed paths, and `touchedFiles`.
- Git snapshots record **paths only** — never stash, reset, commit, or revert.
- Exit code zero without a terminal stream-json `result` is recorded as `failed`.
- Environment values whose names contain `TOKEN`, `KEY`, `SECRET`, or `PASSWORD`
  are redacted from persisted JSON and logs, including bare secret values.

## Stream handling

- stdout is NDJSON; stderr is separate.
- Recognized `init` and `result` events update the job record.
- Malformed lines and unknown events are preserved diagnostically — the wrapper
  does not crash on them.

## Doctor

Checks Node, Git, `cursor-agent` executable, authentication, writable state
storage, and stream-json support. Run before first delegation in a new environment.
