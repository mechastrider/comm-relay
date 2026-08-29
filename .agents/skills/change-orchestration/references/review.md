# Independent review contract

Review happens after implementation and profile QA, in a fresh context whenever
possible. The reviewer is read-only and never shares the implementation
worker's role.

## Inputs

- `git diff` against the declared base;
- proposal, specs, design, contracts, plans, and tasks returned by OpenSpec;
- change brief Scope/Non-goals/Assumptions;
- QA plan and evidence;
- relevant project instructions and convention skills.

## Review order

1. **Promise match** — every acceptance criterion and normative spec scenario
   is implemented; nothing was silently narrowed or deferred.
2. **Scope** — no unrelated feature/refactor; necessary fallout and fixtures are
   included.
3. **Contracts** — public API, serialization, migrations, IPC/events, UI states,
   compatibility, and platform promises match artifacts.
4. **Failure behavior** — validation, auth, transactions, cancellation, retry,
   concurrency, rollback, offline/partial failure, and recovery are coherent.
5. **Verification** — tests prove behavior at the right boundary; QA evidence is
   reproducible and covers risk, negative cases, and supported matrices.
6. **Maintainability** — repository conventions are followed; unnecessary
   duplication and fragile coupling introduced by the change are identified.

## Output

```text
CRITICAL
- <evidence-backed blocker and required correction>

IMPORTANT
- <in-scope defect that should be fixed>

RECOMMENDATIONS
- <non-blocking follow-up>

GOOD
- <strength worth preserving>
```

Every finding names a file/behavior and explains impact. Do not edit. Do not
repeat formatter/linter output without interpreting it. If no findings exist,
say so explicitly and name the evidence reviewed.
