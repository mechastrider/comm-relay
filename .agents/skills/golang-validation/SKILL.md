---
name: golang-validation
description: House Go validation integration — HTTP 400/422 mapping, application layers, and message conventions. Use when connecting muonsoft/validation to application services or HTTP responses; use muonsoft-validation for library rules and APIs.
---

# Application validation conventions

Use [muonsoft-validation](../muonsoft-validation/SKILL.md) for library APIs,
constraints, optional fields, nested collections, translations, and tests.
This companion contains only the hub's application conventions; do not duplicate
library examples here. Both skills are selected by the `backend/go` theme.

## HTTP boundary

Follow [api-conventions](../api-conventions/SKILL.md) for the response envelope
and status mapping:

- Malformed JSON, deserialization, and UUID/string parse failures return **400**.
- With validation wired, field violations and business rules the user can fix
  return **422**, with `violations` and `property_path` in the established envelope.
  Missing references and duplicate unique fields belong here; version/lock
  conflicts retain **409**.
- Preserve technical errors for the existing error handler; do not convert a
  dependency failure into a user violation.
- Simple handler checks do not require introducing the full validator stack.
  If an endpoint has not adopted validation responses, preserve its existing
  explicit 400 contract until migration; do not mix response styles in it.

## Application layers

- `internal/api` owns decoding and transport checks, and maps violations to HTTP.
- Commands and queries own input rules; domain types own reusable invariants.
  Do not keep domain invariants only in HTTP handlers.
- Services use the application's configured validator. Domain validation must
  not depend on HTTP status constants or response serialization.

## Messages

Use English fallback messages in `validation.NewError`, with translations in a
dedicated map when needed. Pass the sentinel's `Message()` as the message template
when creating a violation so configured translations apply. Keep locale selection
out of domain rules and preserve stable codes and external property paths.
