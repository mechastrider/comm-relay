# Desktop UI Contract
## Windows / Views / Entry Points
Existing Live, Studio, Audience and Settings routes; no OS-specific navigation changes.
## Menus / Tray / Commands / Shortcuts
No native changes. Existing keyboard interactions retained.
## View / Flow: audit remediation
### Layout and Components
Compact Studio OBS label fits its button after desktop collapse. Viewer table displays at most 50 rows with previous/next actions and localized range/total. Sorting spans the full result. Progression lists have heading-derived names; named media previews use group semantics.
### Data / Forms / Actions
Achievement subject select displays catalog labels, retains exact IDs and unavailable existing values. Rule descriptions use names. Settings confirmations are scoped to their section. All-disabled empty chat links to Platforms.
### States and Recovery
Loading preserves existing resource indicators. Empty search retains reset. Empty catalog gives a clear option. Failed catalog load offers retry. Offline save retains edits, explains recovery in RU/EN and permits retry. Validation remains associated with fields. Switching metrics explicitly resets incompatible subject selection; unrelated edits preserve it.
## Accessibility / Keyboard / Focus
No aria-modal on desktop aside; listbox names and arrow/Home/End navigation; group names valid. Page controls use native buttons, remain keyboard reachable, and do not invalidate dirty draft guards. Inspector close returns to its connected opener.
## Scaling / Theme / Localization / Reduced Motion
Check 320/375/390/520/768/1024/1440 widths and RU/EN. Audited small-text pairs meet 4.5:1. Existing reduced-motion rules remain.
## Explicit Non-Goals
No new theme or shortcut system.
