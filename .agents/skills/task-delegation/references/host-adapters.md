# Host adapters

Host adapters are thin wrappers that locate the vendored executor and invoke it.
They do **not** own a separate process runner and do **not** expose `--model`.

## Shared executor

All non-Cursor hosts invoke the project-local script:

```
<project>/.agents/skills/task-delegation/scripts/cursor-executor.mjs
```

(or the equivalent path after `agentmem skills init` / preset materialization).

Public commands:

- `doctor`
- `start --task <repo-relative.md> [--background] [--timeout <seconds>]`
- `resume --job <prior-job-id> --task <repo-relative.md> [--background] [--timeout <seconds>]`
- `status --job <id>`
- `result --job <id> [--wait]`
- `cancel --job <id>`

There is no public session, model, or cursor-agent CLI override.

## Codex

- Read this skill directly from the materialized preset.
- Run `cursor-executor.mjs doctor` before the first delegation.
- Delegate with `start --task <packet-path>`; poll with `status` / `result`.
- If the executor, `cursor-agent`, or authentication is unavailable, **stop and
  report** — do not silently write code inline or switch models.

## Claude Code

The `cursor-worker` plugin in this repository's marketplace
(`muonsoft-skills`) supplies slash commands that instruct Claude to locate the
Git root and shell out to the same executor. The plugin contains **no** process
runner, job store, model override, or copied executor logic.

### Install

```text
/plugin marketplace add muonsoft/skills
/plugin install cursor-worker@muonsoft-skills
/reload-plugins
/cursor-worker:doctor
```

### Command contract

| Slash command | Executor invocation | Purpose |
|---|---|---|
| `/cursor-worker:delegate` | `start --task <packet> [--background] [--timeout <s>]` | Delegate a bounded slice after creating/validating a task packet |
| `/cursor-worker:resume` | `resume --job <id> --task <packet> [--background] [--timeout <s>]` | Continue a prior job with a follow-up packet |
| `/cursor-worker:status` | `status [--job <id>]` | Inspect job state |
| `/cursor-worker:result` | `result [--job <id>] [--wait]` | Read terminal job output |
| `/cursor-worker:cancel` | `cancel --job <id>` | Cancel a running job |
| `/cursor-worker:doctor` | `doctor` | Check Node, Git, `cursor-agent`, auth, and state dir |

**Delegate and resume rules for Claude (the orchestrator):**

1. **Create or validate** a repo-local task packet with the fixed sections before
   invoking the executor. When no path is supplied, write under
   `.agent-orchestration/tasks/<slice>.md` — ephemeral scratch space, not a product
   artifact or version-control target. Durable OpenSpec and project-native plans
   stay in their native locations.
2. Pass **only** the executor's public flags (`--task`, `--job`, `--background`,
   `--timeout`, `--wait`). Never pass `--model` or other overrides.
3. Run `doctor` before the first delegation; if the wrapper, `cursor-agent`, or
   authentication is missing, **stop and report** — do not silently write product
   code or switch models.
4. After the executor finishes, **read the diff yourself** and **run the packet's
   verify commands yourself** — review stays with Claude.

**Router guidance:** strong Claude/Opus removes uncertainty, designs, decomposes,
and reviews; **all non-trivial coding** goes to Composer 2.5 through the
executor. Trivial mechanical edits may stay inline with the orchestrator.

### Legacy `freema/cursor-plugin-cc` mapping

The old `cursor@tomas-cursor` plugin is **not removed automatically** when you
install `cursor-worker`. Operators uninstall the legacy plugin manually after a
successful pilot.

| Legacy command | New command | Notes |
|---|---|---|
| `/cursor:delegate` | `/cursor-worker:delegate` | Requires a task packet; maps to executor `start` |
| `/cursor:resume` | `/cursor-worker:resume` | Maps to executor `resume` |
| `/cursor:status` | `/cursor-worker:status` | |
| `/cursor:result` | `/cursor-worker:result` | |
| `/cursor:cancel` | `/cursor-worker:cancel` | |
| `/cursor:setup` | `/cursor-worker:doctor` | Readiness check only |
| `/cursor:review` | *(no replacement)* | Keep review with Claude; do not route to Cursor CLI |
| `/cursor:adversarial-review` | *(no replacement)* | Design critique stays with Claude |
| `/cursor:browser` | *(no replacement)* | Use host browser tools if needed |
| `/cursor:from-plan` | *(no replacement)* | Orchestrator writes the task packet, then `/cursor-worker:delegate` |
| `/cursor:sessions` | *(no replacement)* | Use executor `status` / `result` on job ids |

The legacy plugin owned its own Node process runner and supported `--model`
overrides including `composer-2.5-fast`. The new adapter delegates all execution
to the vendored `cursor-executor.mjs`, which pins `composer-2.5` only.

## Cursor (native worker)

Managed template source:

```
devtools/task-delegation/assets/composer-worker.md
```

Materialized destination (via `agentmem projects attach` or equivalent):

```
<project>/.cursor/agents/composer-worker.md
```

The template body carries the ownership marker
`<!-- agentmem:managed:composer-worker -->` immediately after the YAML
frontmatter. On attach or skill update, agentmem treats a destination file as
**managed and updateable** when its body matches the current template or already
contains that marker. A destination file that **differs** and **lacks** the
marker is treated as user-owned and is **preserved** unless the operator passes
`--force`.

- Strong Cursor parents delegate bounded packets to the native `composer-worker`
  subagent pinned to Composer 2.5.
- The worker edits and verifies the slice **directly** — it must **not** invoke
  `cursor-agent`, `cursor-executor`, or nest another CLI executor.
- **The Cursor host never invokes the CLI wrapper.** Orchestration, review, and
  acceptance stay with the parent.

## Per-project mechanics

Volatile project bits (verify commands, auth env recipe, slash-command aliases)
live in the consuming project's **AGENTS.md**, not in this skill.
