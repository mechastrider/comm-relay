# Implementation Slices

## Slice: `<service behavior>`

> **Outcome**: <complete contract delivered>
> **Acceptance**: `<focused commands/checks>`
> **Skills**: <relevant skill ids>
> **Scope**: <primary areas>
> **Allowed fallout**: adapters, migrations, tests, fixtures, call sites, operational config/docs
> **Blocked**: unrelated services/contracts and unapproved deployment

- [ ] 1.1 Implement the end-to-end behavior
- [ ] 1.2 Add required failure, migration, integration, and test fallout

## Gate: qa

- [ ] Q.1 Execute `qa_plan.md` and record Pass/Partial/Fail evidence

## Gate: review

- [ ] R.1 Fresh diff review; CRITICAL=0; affected checks green
