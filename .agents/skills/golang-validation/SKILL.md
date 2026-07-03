---
name: golang-validation
description: Data validation in Go with github.com/muonsoft/validation — Validatable models, commands, validationtest, and mapping violations to HTTP 422.
---

# Data validation (muonsoft/validation)

Package: `github.com/muonsoft/validation`  
Constraints: `github.com/muonsoft/validation/it`  
Tests: `github.com/muonsoft/validation/validationtest`  
Runner: `github.com/muonsoft/validation/validator`

> Not every handler needs the full validator stack; prefer this skill when adding **command/query validation** or rich 422 responses. For simple handler checks, explicit `writeError(400, ...)` is still fine.

For advanced patterns (collections, enums, translations), see [references/validation-details.md](references/validation-details.md).

## Validatable interface

```go
type Validatable interface {
    Validate(ctx context.Context, v *validation.Validator) error
}
```

## Basic Validate

```go
func (r ResourceDraft) Validate(ctx context.Context, v *validation.Validator) error {
    return v.Validate(ctx,
        validation.StringProperty("name", r.Name,
            it.IsNotBlank(),
            it.HasMaxLength(500),
        ),
        validation.StringProperty("description", r.Description,
            it.HasMaxLength(2000),
        ),
    )
}
```

## Eager validation

One `validator.Validate(ctx, args...)` collects **all** violations. Do not chain per-field `if err != nil { return }` when the API should return a full violation list.

In services:

```go
if err := validator.ValidateIt(ctx, cmd); err != nil {
    return err
}
```

## Optional fields

| Type | Use |
|------|-----|
| `*string` | `validation.NilStringProperty` |
| `*int`, `*float64` | `validation.NilNumberProperty[T]` |
| `*time.Time` | `validation.NilTimeProperty` |

Do not split `Validate` with `if ptr != nil { StringProperty(...) }` — use `Nil*` in one `Validate` call.

## Nested objects

Include nested validation in the **same** parent `Validate`:

```go
validation.ValidProperty("metadata", r.Metadata),
```

Nested types name **relative** fields only (`title`, not `metadata.title` inside the child).

## Manual violations (422)

For business rules not expressible as field constraints:

```go
return v.CreateViolation(ctx,
    ErrInvalidState,
    ErrInvalidState.Message(),
    validation.PropertyName("status"),
)
```

Use **`err.Message()`** as the message argument when translations are wired.

**422 vs 400:** structural JSON/UUID parse errors → 400 (`writeError`); fixable field/business rules → validation / 422.

## Testing

Table-driven tests with `validationtest`:

```go
err := validator.ValidateIt(t.Context(), test.input)

if len(test.wantViolations) == 0 {
    require.NoError(t, err)
} else {
    validationtest.Assert(t, err).
        IsViolationList().
        WithAttributes(test.wantViolations...)
}
```

```go
validationtest.ViolationAttributes{
    PropertyPath: "name",
    Error:        validation.ErrIsBlank,
}
```

## Where validation belongs

| Layer | Responsibility |
|-------|----------------|
| `internal/api` | JSON decode, auth, transport limits → 400 |
| Command/query types | `Validate` on input DTOs when using validator |
| `internal/<domain>` | Domain invariants, business rules — on commands or domain types |

Do not put domain invariant checks only in handlers if you adopt `validation` — keep them on the command or domain type.

## Anti-patterns

- `validation_helpers.go` with imperative `CreateViolation` per field — use `StringProperty` + `it.*` on a `Validatable` command.
- Locale hard-coded in `CreateViolation` — use `validation.NewError` with English default + translation map.
- Returning raw domain errors for form-fixable issues when clients expect `propertyPath` — map to violations in the layer that owns the API contract.

## Checklist

- [ ] Import `github.com/muonsoft/validation/it` for constraints
- [ ] Single `Validate` pass when full violation list is required
- [ ] `Nil*` properties for optional pointers
- [ ] Tests use `validationtest` with `PropertyPath` and `Error`
- [ ] User-facing messages: English in `NewError`; translations in a dedicated map if needed
