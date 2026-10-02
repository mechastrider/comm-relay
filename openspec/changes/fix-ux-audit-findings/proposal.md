## Why
The October 2 audit recorded eleven reproducible UX findings. The user has authorized fixing all of them, including the empty-chat onboarding opportunity. Preserve the existing operator workflow while repairing accessibility, feedback, compact layout and catalog usability.

## Users and Supported Platforms
Local streamers using the browser admin or packaged Wails admin. Existing supported OS matrix is unchanged.

## What Changes
- Restore compact OBS setup label after desktop rail collapse (VIS-H01).
- Correct inspector and preview ARIA, name progression lists, and raise hint contrast (A11Y-C01/H01/H02/H03).
- Localize failed saves and scope feedback to its section (ERR-M01, FBK-L01).
- Bound viewer rendering to 50 rows per page with global sorting/search (PERF-M01).
- Resolve untranslated diagnostics/proxy/XP copy (COPY-M01).
- Offer platform setup when the empty chat has all connectors disabled (ONB-M01).
- Select achievement subjects from named awards/commands, preserving missing IDs explicitly (FORM-M01).

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `admin-and-dock`: empty chat, save feedback, viewer pagination, achievement catalog selection and localized copy.
- `admin-design-system`: compact label containment, contrast, valid named accessible regions.

## Scope / Non-Goals
No backend API contract changes, destructive migrations, platform authorization changes, overlay redesign or new dependencies. This is a Tier 2.5 desktop UI contract change using desktop-change. Browser tests cannot certify native OBS/Wails.

## Impact
React admin, batched read-only viewer level resolution, an additive identity lookup index, shared RU/EN strings, admin tokens, regression tests and Russian changelog. No new external requests or credentials. Existing single-binary distribution remains unchanged.
