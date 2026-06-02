---
name: golang-validation
description: Data validation with github.com/muonsoft/validation. Use when adding Validatable config DTOs or API bodies that should return structured 422 responses.
---

# Data validation (muonsoft/validation)

Package: `github.com/muonsoft/validation`  
Constraints: `github.com/muonsoft/validation/it`  
Tests: `github.com/muonsoft/validation/validationtest`

> comm-relay may use simple handler checks at first (`writeError(400, ...)`). Adopt this skill when config or API inputs need multi-field validation lists.

## Validatable interface

```go
type Validatable interface {
    Validate(ctx context.Context, v *validation.Validator) error
}
```

## Example — Twitch config patch

```go
func (p TwitchPatch) Validate(ctx context.Context, v *validation.Validator) error {
    return v.Validate(ctx,
        validation.StringProperty("channel", p.Channel,
            it.When(p.Enabled, it.IsNotBlank()),
            it.HasMaxLength(100),
        ),
    )
}
```

## Eager validation

One `validator.Validate(ctx, args...)` collects all violations. In services:

```go
if err := validator.ValidateIt(ctx, cmd); err != nil {
    return err
}
```

## HTTP mapping

| Case | Status |
|------|--------|
| Malformed JSON | 400 |
| Field/business rules (validator) | 422 |
| Unknown platform | 404 |

## Testing

```go
validationtest.Assert(t, err).
    IsViolationList().
    WithAttributes(validationtest.ViolationAttributes{
        PropertyPath: "channel",
        Error:        validation.ErrIsBlank,
    })
```

## Where validation belongs

| Layer | Responsibility |
|-------|----------------|
| `internal/api` | JSON decode, size limits → 400 |
| Config/API DTOs | `Validate` when using validator |
| `internal/connector` | Runtime connection errors → sentinels, not 422 |

## Checklist

- [ ] Single `Validate` pass when full violation list is required
- [ ] Tests use `validationtest` with `PropertyPath`
- [ ] User-facing messages in English unless product says otherwise
