# Validation — advanced patterns

Package: `github.com/muonsoft/validation`. Use Context7 MCP library `/muonsoft/validation` for full API docs.

## Collection wrapper + ValidSlice

For `[]*Child` with min count, uniqueness, and per-element rules:

```go
type LineItems []*LineItem

func (items LineItems) Validate(ctx context.Context, v *validation.Validator) error {
    keys := make([]string, len(items))
    for i, item := range items {
        if item != nil {
            keys[i] = item.SKU
        }
    }
    return v.Validate(ctx,
        validation.Countable(len(items), it.HasMinCount(1)),
        validation.Comparables(keys, it.HasUniqueValues[string]()),
        validation.ValidSlice(items),
    )
}

// Parent:
validation.ValidProperty("lineItems", LineItems(o.LineItems)),
```

Paths must be `lineItems[0].quantity` — use `ValidSlice` / `AtIndex`, not `PropertyName("lineItems[0].quantity")`.

## String enums

```go
type ResourceType string

func (t ResourceType) Validate(ctx context.Context, v *validation.Validator) error {
    return v.Validate(ctx,
        validation.Comparable(t,
            it.IsOneOf("article", "link", "note").WithoutBlank(),
        ),
    )
}

// Parent: validation.ValidProperty("type", cmd.Type)
```

## Conditional constraints

```go
validation.StringProperty("kpp", e.KPP,
    it.HasExactLength(9),
    it.IsNotBlank(),
).When(e.Country == "RU")
```

## Check vs ValidatableFunc

| Need | Use |
|------|-----|
| Single field boolean | `validation.CheckProperty("field", cond)` |
| Cross-field rule | `validation.Check(cond)` |
| Complex / external deps | `validation.Valid(validation.ValidatableFunc(...))` |

## Custom errors and translations

```go
var ErrNameRequired = validation.NewError("name_required", "Name is required.")

var ValidationTranslations = map[language.Tag]map[string]catalog.Message{
    language.Russian: {
        ErrNameRequired.Message(): catalog.String("Укажите имя."),
    },
}

validator := validation.NewValidator(
    validation.Translations(ValidationTranslations),
)
```

## Common `it` constraints

| Constraint | Use |
|------------|-----|
| `it.IsNotBlank()` | Non-empty string |
| `it.HasMaxLength(n)` | Max length |
| `it.IsBetween(min, max)` | Numeric range |
| `it.IsOneOf(...)` | Enum |
| `it.HasUniqueValues[T]()` | Unique slice keys |
| `it.IsURL()` | URL format |

## HTTP mapping

When validation is wired to HTTP:

- Return the violation list error from handler → middleware or helper maps to **422** with JSON body.
- Until then, mirror the same rules in handler validation and return **400** with a clear message — do not mix styles in one endpoint.

## Property path rules

- Parent adds prefix via `ValidProperty("parent", child)`.
- Child validates `name`, not `parent.name`.
- Array indices: `validation.ArrayIndex(i)`, not `PropertyName("0")`.
