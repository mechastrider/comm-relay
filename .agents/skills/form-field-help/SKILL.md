---
name: form-field-help
description: Progressive-disclosure per-field help for complex or sensitive form inputs using a native dialog. Use for any field that needs more than a one-line hint — API keys, tokens, OAuth, connection strings, regex, and similar.
---

# Form field help

When a form field needs more explanation than a one-line hint but less than a
full wizard, attach contextual per-field help instead of one long form-level
`<details>` block. The user opens guidance only for the field they are filling.

This applies to any complex or sensitive input — credential fields (API keys,
tokens, OAuth), connection strings, regex/expression inputs, fields with
strict formatting rules — in any form, not just admin or settings screens.

## When to use

- A field whose correct value depends on steps performed elsewhere (e.g. a
  permission checklist for a token, where to find a value)
- A field where a one-line hint is too little but a full wizard is too much
- Recovery guidance shown after a server-side validation failure

## Pattern

1. **Label row** — place the help trigger beside the field label inside a
   block-level container (a `div`), not a `span` wrapping the trigger. An
   interactive control or dialog inside an inline element is invalid HTML.
2. **Short hint** — keep a one-line summary directly under the input; the dialog
   holds the long form.
3. **Dialog content** — put step-by-step instructions in a native `<dialog>`
   opened on click/tap via `showModal()`. Use the `title` attribute only as an
   optional desktop hover supplement, never as the sole affordance (no touch,
   no keyboard).
4. **Separate content per value type** — variants of the same field can need
   different guidance (e.g. read vs write tokens have different permission
   lists); don't share one generic block.
5. **Validation-failure hints** — when the server rejects a value, render a
   contextual recovery hint inline next to the error, not in a modal the user
   must reopen.

## Checklist

- [ ] `aria-label` on the trigger button; dialog has `aria-labelledby`
- [ ] Dialog reuses an existing modal style for visual consistency
- [ ] Steps interpolate known dynamic values (e.g. owner/repo) when available
- [ ] No secrets or example tokens in the help text
