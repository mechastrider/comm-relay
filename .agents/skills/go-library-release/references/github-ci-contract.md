# GitHub CI release contract

Use when introducing or aligning maintainer-dispatched source-library releases.
Keep repository-specific defaults, required checks and scripts in the consumer.
This is a target contract, not a claim that existing workflows already meet it.

## Shared shape

`workflow_dispatch(version)` → resolve candidate → validate → prepare release
commit → publish → verify consumer.

Require an explicit version; do not leave yesterday's release as a prefilled default.
Validate the accepted SemVer subset in a tested parser. Pass inputs to shell through
environment variables and quote expansions rather than embedding expressions into
shell source. The release branch is a parameter; do not rename `master` to `main`
merely to align workflows.

| Stage | Required result |
| --- | --- |
| Resolve | Version, authorized branch and immutable candidate SHA are recorded; dispatch from stale/other branches fails |
| Validate | Required compatibility, quality, security and project-specific lanes pass on that SHA |
| Prepare | Final notes and an unchanged candidate or one allowed changelog-only child are verified locally |
| Publish | Authorized branch update and immutable tag/release identify the verified release SHA |
| Consumer | An external module resolves and imports the published version without local replacements |

Use read-only token permissions by default, write access in the publication job,
and concurrency control scoped to the release stream. Do not cancel a publication
already in progress to replace it with a newer request. Concurrency within one
workflow does not lock out human pushes or other workflows.

## Gate parity and extension points

Define check commands once where practical, and call them from PR CI and release
validation. A release job must depend on all required lanes, not assume that a green
default-branch badge represents its SHA. Preserve conditional requirements explicitly.

Keep these parameters visible:

- module path, release branch and supported Go versions;
- toolchain used for lint/tooling versus toolchains promised to consumers;
- required nested modules, database services, API inventories and dependency policies;
- pinned scanner/linter versions and supported scan configurations;
- consumer smoke entry point and release-notes convention.

Do not run a modern tooling gate blindly on an old supported Go version. Split the
minimum-version build/test lane from tool-dependent lint and module-maintenance
checks when their tooling requires newer Go. A command such as `go mod tidy -diff`
must be supported by the lane that executes it.

Keep required checks fail-closed. A local script may allow missing optional tools,
but a release workflow must install and require them or report an explicit gap.
Security analysis should record the actual analysis toolchain; do not infer the
minimum-version result from a scan of a newer standard library.

When the project supports old Go for compatibility, keep minimum-Go build/tests
required and run required security analysis on a pinned maintained toolchain.
Do not add an old-toolchain security job to ordinary CI or releases by default;
perform that audit manually when needed, unless project policy explicitly requires
it. Required security checks must fail on both findings and scanner/setup/network
errors, with summaries and retained reports distinguishing those outcomes. Never
treat an incomplete scan as clean. A clean modern scan does not establish safety
of an older standard library. Preserve stricter project policy when required.

## Publishing without a branch race

Prepare from the immutable validated SHA. Do not rebase or `pull` a moving branch
into the candidate after validation. Before any push, verify the parent and complete
changed-file set of an allowed changelog-only child, finalized notes, and existing
tag identity. Reject empty notes, including sections containing headings only.

Recheck the remote branch, then use a normal non-force push of the prepared child.
A concurrent branch update should reject that push rather than enter the release.
Define the policy for the no-commit case and later branch movement explicitly: the
tag must always identify the validated release SHA, never a newly resolved branch
head. If policy requires the branch to remain current, detect movement and abort
before creating a new tag. Avoid claims of a global branch lock.

Check tags using their peeled commit. If a tag exists at a different SHA, stop;
do not move it. A same-SHA tag or release may be reconciled idempotently. Define
recovery for a branch commit pushed successfully but publication failing afterward:
a fresh dispatch can validate the current branch, whereas rerunning an old event
may still carry the old SHA. Test that distinction in the workflow design.

Pushes made with `GITHUB_TOKEN` generally do not trigger another ordinary push
workflow. Run needed post-publication checks as explicit dependent jobs rather than
assuming tag-push CI will do them. See
[GitHub workflow triggering](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).

## Reuse and rollout

Start by aligning this contract and the local validation entry points. For several
libraries, extract a versioned reusable workflow only after its inputs and special
gates are clear. Share validation separately from privileged publication when that
keeps permissions narrow. Repository-owned jobs can provide specialized services
and export a gate result for publication.

Pin cross-repository reuse to a reviewed revision and make upgrades explicit.
Reusable workflows use `workflow_call` and are invoked at job level; preserve the
caller's permission ceiling. See
[GitHub reusable workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows).

Before rollout, check workflow syntax and isolated release-script fixtures. Include
invalid version, empty notes, existing finalized notes, duplicate version, stale
branch, concurrent update, annotated tag and partial-publication recovery cases.
Verify branch protection and token permissions separately from repository files.
Use a sandbox repository for a publication rehearsal when authorized; a YAML lint
or changelog script test alone does not establish that hosted publication works.
