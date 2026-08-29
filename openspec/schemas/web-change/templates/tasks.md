# Implementation Slices

Instantiate only the slices this change needs. List omitted types under
**Skipped slices** with a reason. Checkboxes are required for tracking, but
slice sections are coverage boundaries, not necessarily one worker job each.

## Skipped slices

- `<type>` — <reason>

## Slice: `<semantic name>`

> **Type**: domain-api | infra | webapp | tests
> **Outcome**: <complete behavior delivered by this slice>
> **Acceptance**: `<focused commands and observable checks>`
> **Skills**: <project/catalog skill ids>
> **Scope**: <primary areas>
> **Allowed fallout**: <tests, fixtures, call sites, generated files, adjacent coherence refactors>
> **Blocked**: <areas/invariants that must not change>

- [ ] 1.1 <concrete coverage requirement>
- [ ] 1.2 <tests/fixtures/fallout required for the same outcome>

## Gate: browser

> **Type**: browser
> **Acceptance**: execute `qa_plan.md`; evidence; Pass/Partial/Fail; P0 blocks review
> **Skills**: <browser/testing/accessibility skills>
> **Scope**: running system and fixes for defects found in planned scenarios
> **Allowed fallout**: focused code/test/fixture fixes inside change scope
> **Blocked**: new features or unplanned scenario expansion

- [ ] Q.1 Execute planned automated and browser scenarios
- [ ] Q.2 Record evidence and remaining gaps

## Gate: review

> **Type**: review
> **Acceptance**: fresh diff review; CRITICAL=0; affected checks green
> **Skills**: <relevant convention/review skills>
> **Scope**: diff vs declared base plus change artifacts
> **Allowed fallout**: one batched correction pass for accepted findings
> **Blocked**: drive-by refactors and self-review by the implementer

- [ ] R.1 Record CRITICAL / IMPORTANT / RECOMMENDATIONS / GOOD
