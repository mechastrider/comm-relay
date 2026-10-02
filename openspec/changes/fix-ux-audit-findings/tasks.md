# Implementation Slices
## Slice: Readable and accessible operator UI
> Outcome: VIS-H01, A11Y-C01/H01/H02/H03, COPY-M01 repaired.
> Skills: ux-form-practices, web-constrained-layout.
> Scope: admin CSS, semantic markup and RU/EN strings.
- [x] 1.1 Restore compact label sizing and AA muted text contrast.
- [x] 1.2 Correct inspector/preview/listbox semantics and progression keyboard behavior.
- [x] 1.3 Localize diagnostics, proxy and activity copy.
## Slice: Reliable settings and first setup
- [x] 2.1 Localize failed transport saves, preserve draft/retry, and scope feedback (ERR-M01, FBK-L01).
- [x] 2.2 Add conditional platform setup CTA (ONB-M01).
## Slice: Bounded viewers and named achievement subjects
- [x] 3.1 Add 50-row pagination with global sort/search and preserved inspector safeguards (PERF-M01).
- [x] 3.2 Add catalog subject selects, missing-value/retry handling and named descriptions (FORM-M01).
## Backend performance
- [x] 3.3 Batch directory progression resolution and verify threshold/level payload parity; add/test reversible identity lookup index and measure the real API.
## Docs
- [x] 4.1 Update Russian changelog and sync canonical specs.
## Gate: qa
- [x] Q.1 Run npm ci, npm run typecheck, npm run lint, npm test, npm run build and npm run test:e2e; record browser regression evidence.
- [x] Q.2 Run Go tests and golangci-lint using writable cache; document unavailable platform checks.
## Gate: review
- [x] R.1 Review diff and regression results; resolve all introduced failures.
## Gate: distribution-readiness
- [x] D.1 Verify embedded server build; no publication or signing.
