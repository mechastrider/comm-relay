# Test-pruning campaign

Run this only when asked to prune one subsystem's whole test surface in one
change: a Go area under `cmd/` or `internal/`, one web feature, or one Android
module. The value bar, retention bar, candidate evidence, and validation in
[SKILL.md](SKILL.md) apply to every lane. This file adds the order of work.
Each step ends on its completion criterion; do not start the next step early.

## 1. Baseline

Record the subsystem's test and support line counts and every test file's
pass/fail state at a pinned base SHA. Keep baseline failures in their own
list. A red test at the start is often a real product bug, not a stale test.

Done when every in-scope test file has a recorded baseline result.

## 2. Lanes and inventory

Split the surface into **lanes** along production owner boundaries, not file
prefixes. A Go HTTP area might split into handlers, validation, storage,
transport, and shared fixtures. Include the subsystem's cases at shared
boundaries and its UI or device tests when it owns them.

Done when every test file the subsystem owns belongs to exactly one lane.

## 3. Read-only ledger per lane

Give each lane to its own read-only pass. Read every assigned test in full,
including parameter tables. Also read the production owners and their entry
points, callers, history, and CI routing. Each test declaration goes into a
written **ledger** with one mark. A table-driven test (`t.Run` subtests, or a
Vitest `it.each`) is one declaration unless its rows need different marks;
then mark each row.

- `R`: retain, naming the contract and the bug it catches; a retained test that
  only moves to a better-named file stays `R` with the move noted;
- `F`: retain the contract but repair the assertion, such as a vacuous negative
  that passes when only one of several items is missing;
- `C`: consolidate, naming the owner that absorbs the assertion first: a sibling
  table case, a stronger boundary suite, or the shared owner in another package;
- `D`: delete, naming the proof that remains, or why no contract exists.

Judge a test by its assertions, not its name. A test named `Expect409` that
passes because a different guard denied the request is not a 409 contract.

Done when every declaration in the lane has a mark and an evidence line.

## 4. Layer plan per lane

Treat the per-test ledger as input, not as the edit list. A second read-only
pass, starting from the ledger, looks for the redundant **layer**: several
suites replaying one helper through a mock when a real handler, HTTP fixture,
or device boundary already proves the contract. Name the **keeper** suite for
each contract. Prefer the real boundary over a mocked collaborator. Correct
any ledger errors this pass finds.

Done when each lane plan names its retired files, its keeper per contract, the
assertions to carry into keepers, and the test-only production seams unlocked.

## 5. Cutover

Edit lane by lane. Serialize changes to shared harnesses and support files
through one owner. With each lane, remove the test-only production seams it
unlocks: injection parameters, getters, reset exports, and indirection layers.
If CI enumerates packages or test tasks, register moved suites there. Do not
regenerate screenshot or golden baselines to make a suite green; when goldens
are the contract, follow
[compose-verification](../../frontend/android/compose-verification/SKILL.md).
If the repository has an unused-file or unused-export check, run it before
landing the cutover. Removed tests orphan support files and exports that the
ordinary test command misses. Put durable test-ownership rules in the
subsystem's `AGENTS.md`, drawn from mistakes this campaign actually found.

Done when every lane plan is applied and each lane's keepers pass.

## 6. Preservation review

Before claiming completion, have independent reviewers compare deleted
coverage against the keepers, one reviewer per boundary group. They look for
contracts that lost their only proof. They also look for new assertions that
cannot fail, such as a rejection row the production code never reaches.

For each restored contract, make one deliberate **mutation** of the production
owner and confirm the keeper goes red. Then restore the source byte for byte.

Done when every reported gap is restored or rejected with source evidence, and
every restored contract has a caught mutation.

## 7. Product defects

A baseline failure that survives into a keeper is a bug report. Fix it at its
owner as a separate commit, and prove it through the real user flow, with a
**control** run that reverts the fix and shows the old behavior. Record
unrelated product discrepancies as follow-ups instead of fixing them in the
campaign.

Done when each repaired defect has a failing control and a passing candidate
on the same harness.

## 8. Reconcile and hand off

Campaigns outlive many base-branch commits. Merge the base branch rather than
rebasing a long, many-commit campaign. When the base branch modified a file
the campaign deleted, keep the deletion. Port the new contract into the keeper
instead, and confirm every new regression the base branch added still has a
home. Rerun the whole subsystem suite on the merged head.

A large diff may show a truncated file list in review tooling. Say so in the
handoff instead of splitting the campaign after the cutover has started.

Hand off with the [SKILL.md](SKILL.md) report, plus:

- baseline and final test/support line counts, with production counted separately;
- lanes, retired layers, and keepers;
- preservation gaps found and their mutations;
- product defects with control and candidate proof.
