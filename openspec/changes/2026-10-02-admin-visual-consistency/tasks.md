# Implementation Slices
## Slice: shared admin visual contract
> **Outcome**: consistent actions, fields, headings and native controls across admin.
> **Acceptance**: typecheck/lint/unit and rendered geometry checks.
> **Skills**: web-static-frontend, ux-form-practices, web-constrained-layout.
> **Scope**: admin components/styles and their consumers.
> **Blocked**: backend/API changes, new UI kit, publishing.
- [x] 1.1 Frontend: consolidate tokens/base CSS and reusable action/field components; migrate ordinary actions.
- [x] 1.2 Frontend: normalize workspace headings, secondary controls and semantic action colors.
## Slice: consistent catalog sections
> **Outcome**: greetings, awards and commands share meaningful styled sections.
> **Acceptance**: catalog interactions and section/overflow checks.
> **Scope**: catalog forms, shared FormSection, RU/EN labels.
- [x] 2.1 Frontend: group related fields without changing IDs, state or payloads.
- [x] 2.2 Verification: add rendered regression checks and inspect representative pages/states.
## Docs
- [x] 3.1 Add Russian changelog entry and synchronize canonical spec.
## Gate: qa
- [x] Q.1 Run npm run typecheck, npm run lint, npm test, npm run build, npm run test:e2e; record results and visual checks.
- [x] Q.2 Run go test ./... and golangci-lint run ./...; record platform skips.
## Gate: review
- [x] R.1 Fresh diff review; resolve material issues and rerun affected checks.
## Gate: distribution-readiness
- [x] D.1 Verify frontend/embed readiness without signing/publishing; record native smoke limitation.

## Follow-up: readable tooltips
- [x] T.1 Prevent shared hints from shrinking to narrow action widths or inheriting arbitrary word breaks.
- [x] T.2 Keep Live and Audience toolbar hints within the viewport and document the contract.
- [x] T.3 Verify word rectangles, bounds and hover/focus in RU/EN across three widths and browsers; rerun affected checks.
