---
name: go-library-release
description: Prepare and verify a Go library release with supported-toolchain checks, vulnerability evidence, immutable version tags and clean consumer validation. Use for release readiness or an authorized publication, not routine Go edits.
---

# Go library release

Read the module's compatibility policy, `go.mod`, release workflow and changelog.
Separate preparation from publication. Follow the user's existing authorization;
release preparation alone does not authorize pushing, tagging or publishing.
Prefer the repository's established release entry point over a parallel manual path.

When aligning GitHub Actions across libraries, read the
[GitHub CI release contract](references/github-ci-contract.md). It defines shared
stages and extension points while preserving each library's compatibility gates.

## Define the candidate

Record the intended version, source revision, module path, supported Go/platform
matrix, and any generated release metadata. Check the version's compatibility with
the public API and module major-version path. Preserve existing changelog sections;
describe consumer-visible changes and migration requirements.

Identify whether the workflow creates a release commit after validation. If so,
define which checks rerun on that commit, and explicitly prove any allowed
metadata-only delta. Do not label results from an earlier revision as checks of the
final release SHA without accounting for the difference.

## Verify compatibility and security separately

When the project supports old Go for compatibility, keep minimum-Go build/tests
required and run required security analysis on a pinned maintained toolchain.
Do not add an old-toolchain security job to ordinary CI or releases by default;
perform that audit manually when needed, unless project policy explicitly requires
it. Required security checks must fail on both findings and scanner/setup/network
errors, with summaries and retained reports distinguishing those outcomes. Never
treat an incomplete scan as clean. A clean modern scan does not establish safety
of an older standard library. Preserve stricter project policy when required.

- Run the project's unit, integration, API compatibility and other required gates.
  Build tags and platform-specific files can exclude code from a plain `go test ./...`.
- Test the declared minimum supported Go toolchain and supported platform matrix.
  Add current stable Go as a forward-compatibility lane when the project requires it.
  Inspect the effective toolchain, not only an environment variable: Go can select
  or download another toolchain. See [Go toolchain selection](https://go.dev/doc/toolchain).
- Run the chosen pinned vulnerability scanner and record its version, scan time,
  database provenance where available, target platform and effective Go version.
  A scan using a newer standard library does not establish vulnerability status
  for the minimum supported toolchain. If the minimum is declared only as a language
  version, document the actual patch version tested instead of claiming an exact
  patch guarantee the project never made.
- If a pinned scanner cannot analyze the supported minimum, report that gap and
  resolve the tooling or support policy; do not silently scan newer Go and mark the
  minimum lane green. Scanner build requirements and analysis targets may differ.
- Treat findings according to the project's security policy. Passing tests, race
  checks and license checks does not substitute for vulnerability analysis; a clean
  scan does not prove absence of all vulnerabilities. See
  [Go vulnerability management](https://go.dev/doc/security/vuln/).

Keep release tooling isolated from consumer runtime dependencies where possible.
Separate network-dependent scanning from offline checks if the repository promises
an offline gate. Verify distributable notices against exact dependency versions and
actual distributed files rather than only dependency names.

## Validate as a consumer

Use a temporary external module that imports the public API. Before publication,
a local replacement can check the candidate's API, but cannot establish that the
published version resolves correctly. After an authorized release, verify the exact
version without local replacements or workspace overrides, using an isolated module
and cache as appropriate. Record resolution/download failures distinctly from API
compile failures; a remote index delay is not a reason to move an existing tag.

## Publish through the established workflow

When publication is authorized:

1. Confirm required checks correspond to the candidate and the expected branch has
   not moved. Use the project's concurrency protection to prevent overlapping releases.
2. Run the maintainer workflow or approved release command. Grant write permissions
   only to the publication portion where the workflow supports that separation.
3. Resolve an existing tag to its commit, accounting for annotated tags. A tag that
   already points elsewhere is a conflict: never force-move a published version.
4. Verify the release commit, tag, notes and intended artifacts agree. A source-only
   library need not acquire binary artifacts merely to satisfy a generic checklist.
5. Complete the clean consumer check and report the exact release URL/version.

After a lost response, inspect remote refs and workflow state before retrying.
Reuse or reconcile an existing run according to its contract; do not create another
release blindly. Stop at a conflicting tag, failed gate, or ambiguous publication
that cannot be safely reconciled, preserving the evidence and next required action.

## Handoff

Report candidate/final SHA, version, effective toolchains, checks and scan timestamps,
consumer result, and whether publication occurred. Explicitly identify skipped gates
and unresolved findings. For benchmark claims in release notes, apply
[evaluation-integrity](../../../process/evaluation-integrity/SKILL.md).
