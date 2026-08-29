# Implementation Slices

## Slice: `<mobile user outcome>`

> **Outcome**: <complete behavior across relevant shared/native/UI/data layers>
> **Acceptance**: `<focused commands and device checks>`
> **Skills**: <relevant skill ids>
> **Scope**: <primary modules/screens/platforms>
> **Allowed fallout**: native adapters, UI, sync, permissions, tests, fixtures, build metadata/docs
> **Blocked**: unrelated features, signing/upload/store submission, unsupported device expansion

- [ ] 1.1 Implement the complete user outcome
- [ ] 1.2 Add lifecycle, offline, permission, platform, test and build fallout

## Gate: qa
- [ ] Q.1 Execute `qa_plan.md`; record matrix coverage and evidence

## Gate: review
- [ ] R.1 Fresh diff review; CRITICAL=0; affected checks green

## Gate: release-readiness
- [ ] L.1 Validate archive/release readiness without signing or submission
