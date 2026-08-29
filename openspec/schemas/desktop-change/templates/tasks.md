# Implementation Slices

## Slice: `<desktop user outcome>`

> **Outcome**: <complete behavior across relevant layers/platforms>
> **Acceptance**: `<focused commands and smoke checks>`
> **Skills**: <relevant skill ids>
> **Scope**: <primary components/platforms>
> **Allowed fallout**: adapters, UI, tests, fixtures, migrations, packaging config/docs
> **Blocked**: unrelated features, signing, publishing, unsupported platform expansion

- [ ] 1.1 Implement the complete user outcome
- [ ] 1.2 Add platform, state, test, migration, and packaging fallout

## Gate: qa
- [ ] Q.1 Execute `qa_plan.md`; record matrix coverage and evidence

## Gate: review
- [ ] R.1 Fresh diff review; CRITICAL=0; affected checks green

## Gate: distribution-readiness
- [ ] D.1 Validate package/update readiness without signing or publishing
