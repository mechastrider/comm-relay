---
name: test-audit
description: "Use when adding or materially changing tests, reviewing test changes, or when asked to sweep low-value tests. Authoring gate for whether a test should exist; audit for implementation-coupled, duplicative, or test-only seams. Campaign mode only when asked to prune one subsystem. Stack style stays in golang-tests, web-frontend-tests, and compose-verification."
---

# Test Audit

Decide whether a test earns its keep. How to write the test stays in the stack
skill: [golang-tests](../../backend/go/golang-tests/SKILL.md),
[web-frontend-tests](../../frontend/web/web-frontend-tests/SKILL.md), or
[compose-verification](../../frontend/android/compose-verification/SKILL.md).
Evaluation datasets and model gates stay in
[evaluation-integrity](../evaluation-integrity/SKILL.md); do not prune them
with this workflow.

- Authoring gates every new or materially changed test.
- Audits remove low-value proof in coherent owner batches; never chase deletion counts.
- A whole-subsystem campaign runs only when asked to prune one subsystem. Read [CAMPAIGN.md](CAMPAIGN.md) first.

## Authoring gate

Before adding a test, answer:

1. What observable behavior, invariant, or independent contract does it protect?
2. What credible regression makes it fail?
3. Why does existing proof miss it? Each contract has one primary owner at the strongest boundary. Another layer needs a distinct transport or lifecycle risk. Extend a table or shared fixture, and consolidate repeated setup.
4. Does it need an export, flag, wrapper, or injection hook that no production caller needs? Move the proof to the real boundary instead.

Regressions must fail on the pre-fix code for the intended reason and pass after the owner-boundary repair. If that baseline proof is unavailable, say so. One owner regression covers the bug; do not replay it at every layer it crosses. A behavior-preserving refactor should not break the test.

## Junk patterns

Reject self-comparisons, copied inventories, source greps, implementation or call-shape assertions, duplicate contracts, test-only seams, subject-generated expected values, and mocks that supply the asserted behavior. Fixtures must not fabricate the receipt, admission, or ordering the owner should produce, or claim a persistence path the code never writes. Negative controls must fail at the intended guard, and names must match the behavior the test exercises. When auditing existing tests, use the [full checklist](references/audit.md#junk-patterns).

## Retention bar

Keep a test that independently enforces a public API, HTTP or JSON contract, protocol, config, migration, storage, security, platform, release, or architecture contract. Also keep observable call ordering and regressions with a credible failure mode. Source inspection is valid when it is the cheapest independent guard of a user-facing key, byte, or path and it survives an identifier-only refactor. Static or slow is not a deletion reason. A baseline failure may be a product bug: reproduce it and repair the owner rather than deleting the test.

## Audit and validation

Before an audit edit, read the [candidate evidence and workflow](references/audit.md#candidate-evidence). Inspect the full owners, callers, and history, and record the remaining proof before deletion. Delete obsolete production seams with the tests. Do not optimize for deletion counts.

Run the repository's existing command for the smallest owner and its siblings:

- Go: `go test` for that package;
- web: the project's Vitest script, usually from `web/`;
- Android: the module tasks named by the consumer's verification policy.

Do not edit source or tests while a test process is already running in this checkout. When a removal batch can orphan support files or exports, run the repository's unused-code check if it has one before landing. For a removed source grep or plan assertion, run the executable or dry-run that owns the real contract. Run the repository's formatter for the touched files, then `git diff --check`. Inspect `git diff --numstat` and report production code separately from tests and test support.

Report the root cause, removed low-value categories, retained contracts and why they stay, the focused proof actually run, production versus test LOC, and named follow-ups. Commit, push, or open a pull request only when the user asks.
