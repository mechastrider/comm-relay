# Audit workflow

- Use after the [authoring gate](../SKILL.md#authoring-gate).
- Whole-subsystem campaigns run only when asked, and also require [CAMPAIGN.md](../CAMPAIGN.md).

## Junk patterns

Reject a new match unless the [retention bar](#retention-bar) names the independent contract it guards. Audit existing matches:

- Assertion-free probes, self-comparisons, identity copiers, and subject-generated expected values.
- Copied inventories, manifests, or export lists; exact source, import, or string greps.
- Private predicate or call-shape tests that duplicate boundary proof; repeated invocations or provider-local replays of shared helpers.
- Test-only exports, globals, or wrappers; production paths whose only callers are tests.
- Mocks that implement the asserted behavior, or one identical mock standing in for different APIs.
- Fixtures that supply the receipt, admission, or callback ordering the owner should produce, or persistence asserted against a store the path never writes.
- Capability flags asserted instead of the delivery or acknowledgement the flag promises.
- Negative controls that pass because a different guard denied the request, or because the production path never reaches that rejection.
- Names or fixtures that promise behavior the inputs and assertions never exercise.

## Retention bar

Keep a test that independently enforces a public API, HTTP or JSON contract, protocol, config, migration, storage, security, platform, release, or architecture contract. Also keep observable call ordering and regressions with a credible failure mode. Source inspection is valid when it is the cheapest independent guard of a user-facing key, byte, or path and it survives an identifier-only refactor. Static or slow is not a deletion reason. A baseline failure may be a product bug: reproduce it and repair the owner rather than deleting the test.

Contracts already required by the stack skill count as independent proof: a fallback branch whose preceding branches miss; raw JSON that distinguishes `[]` from `null`; middleware behavior observed through the wrapped handler; a lifecycle round trip the command claims.

## Candidate evidence

Before editing, read the complete test and production owner, its entry point, callers, callees, sibling implementations, overlapping tests, CI routing, and relevant history. When the test claims dependency-backed behavior, inspect the dependency source or types directly. Read root and scoped `AGENTS.md` files and the stack skill first.

Record each candidate's:

- exact test name and location, and the failure it can actually detect;
- non-test callers of the covered production or support seam;
- stronger remaining owner-boundary proof, or why no proof is needed;
- relevant history and the reason the test or seam exists;
- production or test-support deletion unlocked;
- risk and the focused validation command.

A missing field means the candidate is not ready for deletion. Keep discovery read-only and report evidence before editing. Outside campaign mode, prefer a few high-confidence candidates. Parallel discovery may split independent owners.

Delete obsolete seams and dead paths. Move retained regressions to their canonical owners. Consolidate repeated package or dependency assertions into one generic contract. Prefer net-negative production LOC. Do not add replacement tests that restate the same implementation, and do not convert uncertain candidates into cleanup to increase deletion counts.

## Validation and handoff

Do not edit source or tests while a test process is already running in this checkout. Run the repository's existing command for the smallest owner and its siblings: `go test` for that Go package, the project's Vitest script for web, or the Android module tasks named by the consumer's verification policy. When a removal batch can orphan support files or exports, run the repository's unused-code check if it has one before landing. For a removed source grep or plan assertion, run the executable or dry-run that owns the real contract.

Run the repository's formatter for the touched files, then `git diff --check`. Inspect `git diff --numstat` and report production code separately from tests and test support.

Report the root cause, removed categories and seams, retained false positives and why they remain valuable, the focused proof actually run, production versus test LOC, pull request state when one was requested, and named follow-ups. Commit, push, or open a pull request only when the user asks. After a batch lands, refresh from the current base branch and rerun read-only discovery before another audit batch.
