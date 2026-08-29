# Delegation transports

The outer workflow owns routing; **task-delegation** owns packet and executor
contracts. Select one writer transport at a time.

## Herdr-first path

Use this path only inside an explicitly invoked `change-orchestration` workflow.

1. Read the installed **herdr** skill completely.
2. Verify `HERDR_ENV=1`. If false, use the script path.
3. Learn the installed CLI with `herdr --help` and the relevant command groups.
4. Inspect current workspace/pane/agent state using explicit current IDs.
5. Reuse a healthy named Cursor worker only when it is idle and its working
   directory/repository are correct. Otherwise split a sibling pane with the
   current cwd and `--no-focus`, then start the configured Cursor agent kind.
6. The project `AGENTS.md` owns the exact native arguments needed to select
   Composer 2.5. Discover the installed kind/options; do not guess a model flag.
7. Prompt with the one-line task-packet pointer and wait for a settled state.
8. On `blocked`, inspect state/output and answer only questions the parent can
   resolve from the approved change. Escalate product decisions to the user.
9. Read the worker response. If alternate-screen history is missing, ask once
   for a Markdown result in a temporary path, then read it directly.
10. Independently inspect the diff and run acceptance.

Do not close user-owned tabs/panes. Keep focus on the parent pane.

## Herdr recovery

Herdr control is unreliable when any of these persist after one targeted retry:

- the named agent/pane disappears or changes identity;
- prompt/wait repeatedly stalls without an observable lifecycle transition;
- state is `unknown` and output/diff cannot establish whether work settled;
- the response cannot be recovered from pane output or a temporary result file;
- the pane is alive but no longer accepts agent control commands.

Recovery procedure:

1. Stop sending prompts. Do not assume success or failure.
2. Read the repository diff/status and run safe focused checks.
3. Classify observed work as complete, coherent-but-failing, or partial.
4. If complete, review and accept from evidence; no fallback writer is needed.
5. If partial, write a **new** remaining-work/correction packet describing the
   current tree. Do not replay the original packet wholesale.
6. Run the script executor `doctor`. If healthy, start the new packet through
   cursor-executor. Record transport as `mixed-after-recovery`.
7. If script fallback is unavailable, stop with the diff/check evidence. Do not
   write non-trivial product code inline.

Never start the script writer while the Herdr worker is still known to be
actively writing. If state cannot prove it stopped, interrupt/cancel the worker
through Herdr when safe; otherwise stop for user coordination.

## Cursor executor fallback

Follow **task-delegation** `references/host-adapters.md` and
`references/reliability.md`:

1. Run `cursor-executor.mjs doctor` before the first job.
2. Start with a repository-local packet path.
3. Use compact status/result surfaces; inspect bounded logs only on failure.
4. Resume only for the same semantic slice and a fresh correction packet.
5. One active writer per repository; never bypass the executor lock.
6. Parent reads the diff and owns acceptance.

The fallback is a supported transport, not a lower-quality planning route. It
receives the same broad packet and acceptance contract as Herdr.
