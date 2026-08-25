---
name: skill-authoring
description: How to write and publish agent skills for the muonsoft/skills hub — generic content, catalog entries, lint, and consumer overlays. Use when adding or editing hub-tracked skills.
---

# Hub skill authoring

Skills in [muonsoft/skills](https://github.com/muonsoft/skills) are vendored into
consumer repositories with `agentmem skills init` / `agentmem skills pull`. Hub
skills are **reusable policies** — not a substitute for project documentation.

## Hub vs consumer repository

| Belongs in the hub | Belongs in the consumer repo |
| --- | --- |
| UX/API patterns any app can adopt | Product names, routes, config keys |
| Generic workflows (forms, layout, errors) | Concrete CSS classes, file paths, DOM hooks |
| Links between hub skills (relative paths) | `AGENTS.md`, local-only skills, `docs/` |
| Technology conventions (vanilla JS, Go errors) | Repo-specific i18n catalogs and file layout |

**Rule:** If a sentence only makes sense in one repository, it does not belong in
a hub skill.

### Examples

**Bad (hub):**

```markdown
- Wrap the control in `has-tooltip` and import `web/shared/tooltip.css`.
- In CommRelay admin, use `obs.panelImageFitCover`.
```

**Good (hub):**

```markdown
- Icon-only controls must show a hover/focus tooltip with a short localized label;
  also expose an accessible name (`aria-label` or visible text).
- Consumer repos implement markup and styles; document the concrete pattern in
  `AGENTS.md` or a local overlay skill that survives `agentmem skills pull`.
```

## Skill file layout

```text
<theme>/<skill-id>/
├── SKILL.md          # required — frontmatter + body
├── references/       # optional deep dives
├── scripts/          # optional validators/helpers
└── templates/        # optional copy-paste starters
```

### Frontmatter

```yaml
---
name: skill-id          # stable id; matches catalog.yaml id
description: One line — what it does and when to invoke it.
---
```

Write the `description` so agents can match it to tasks (verbs, scope, triggers).

## Register in `catalog.yaml`

Every published skill needs a catalog entry:

```yaml
- id: skill-id
  theme: devtools
  path: devtools/skill-id
  tags: [global]
  summary: "Short catalog blurb for presets and search."
```

- **`theme`** — folder grouping (`frontend/web`, `devtools`, `backend/go`, …).
- **`tags`** — preset filters (`global`, `frontend`, `backend`, …).
- **`summary`** — one line; shown in tooling and preset resolution.
- **`vendored` / `immutable_from_memory`** — only for third-party copies; do not
  hand-edit vendored trees.

Run **`agentmem skills lint-hub`** before opening a PR.

## Writing body content

1. **Lead with when to use** — workflow or checklist the agent can follow.
2. **Stay technology-generic** unless the skill theme is explicitly language- or
   stack-specific (for example `golang-errors`).
3. **Link related hub skills** with relative paths
   (`[ux-form-practices](../../frontend/ux/ux-form-practices/SKILL.md)`).
4. **Defer implementation detail** — state the requirement; point consumers to
   their own docs for class names, paths, and config keys.
5. **Keep SKILL.md scannable** — tables and checklists over long prose.

## Consumer overlays

After `agentmem skills pull`, hub files under `.agents/skills/` are replaced.
Project-specific guidance must live outside vendored copies:

- **`AGENTS.md`** — short pointers to local conventions.
- **Local skills** — directories **not** listed in `skills.lock.yaml`
  `selected_paths` (for example product domain skills).
- **`skills.lock.yaml` `exclude`** — keep hub skills out of the install set when
  the project fully owns a fork (use sparingly).

Do not edit vendored hub skills in consumer repos for long-lived project rules —
those edits are lost on the next pull.

## Publish workflow

1. Branch from `main` in `muonsoft/skills`.
2. Edit `SKILL.md` (+ optional assets) and `catalog.yaml`.
3. `agentmem skills lint-hub`
4. Open a PR; get review; merge to `main`.
5. In each consumer repo: `agentmem skills pull` (updates `skills.lock.yaml` hashes).

To propose changes from a consumer repo after local iteration:
`agentmem skills push` (opens a hub PR with the diff).

## Checklist

- [ ] Skill is reusable outside one product/repo
- [ ] No consumer file paths, CSS class names, or product branding
- [ ] `name` / `description` frontmatter present
- [ ] `catalog.yaml` entry with `id`, `theme`, `path`, `tags`, `summary`
- [ ] `agentmem skills lint-hub` passes
- [ ] Related hub skills linked with relative paths
- [ ] Consumer implementation details documented in the target repo, not here
