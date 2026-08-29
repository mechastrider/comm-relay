# Implementation Slices

## Slice: `<consumer-visible outcome>`

> **Outcome**: <complete behavior>
> **Acceptance**: `<focused commands/checks>`
> **Skills**: <relevant skill ids>
> **Scope**: <primary packages/modules>
> **Allowed fallout**: tests, examples, docs, consumers, generated files, packaging
> **Blocked**: unrelated API or behavior changes

- [ ] 1.1 Implement the complete outcome
- [ ] 1.2 Add required tests/examples/docs and compatibility fallout

## Gate: qa

- [ ] Q.1 Execute `qa_plan.md` and record evidence

## Gate: review

- [ ] R.1 Fresh diff review; CRITICAL=0; affected checks green

## Gate: release-readiness

- [ ] L.1 Validate `release_plan.md` readiness without publishing
