---
name: golang-errors
description: Working with errors in Go using github.com/muonsoft/errors. Use when creating sentinels, typed errors, wrapping with context, structured attributes, errors.Is/As, or mapping domain errors to HTTP.
---

# Errors in Go (muonsoft/errors)

Package: `github.com/muonsoft/errors` — use for `New`, `Errorf`, `Is`, `As`, `Wrap`, etc.

**Do not import the standard `errors` package** for `Is` / `As` in application code: muonsoft provides them. Generic **`errors.As[T](err) (T, bool)`** — not stdlib `errors.As(err, &target)`.

## Package functions

| Function | Purpose |
|----------|---------|
| `errors.New(msg)` | Sentinel at package level (no stack) |
| `errors.Errorf("action: %w", err)` | Wrap with context + stack |
| `errors.Wrap(err, options...)` | Wrap typed errors / sentinels |
| `errors.SkipCaller()` | Skip a frame from stack trace |
| `errors.Is(err, target)` | Sentinel match |
| `errors.As[T](err) (T, bool)` | Extract typed error |

**Never use `fmt.Errorf` for wrapping** — it does not preserve the call stack.

## Sentinel errors

`errors.New` is **only** for package-level sentinels. For one-off messages use `errors.Errorf`.

```go
var (
    ErrNodeNotFound = errors.New("node not found")
    ErrInvalidPath  = errors.New("invalid path")
)
```

```go
// Wrap sentinel with extra context when it helps debugging
return errors.Errorf("%w: path %q", ErrNodeNotFound, path)
```

## Typed errors

For errors with extra data:

```go
type ConflictError struct {
    Path string
}

func (e *ConflictError) Error() string {
    return fmt.Sprintf("conflict at %q", e.Path)
}

func NewConflictError(path string) error {
    return errors.Wrap(&ConflictError{Path: path}, errors.SkipCaller())
}

var ErrConflict = errors.New("conflict")

func (e *ConflictError) Is(target error) bool {
    return errors.Is(ErrConflict, target)
}
```

## Wrapping on return

**Every `return ..., err`** from handlers and internal packages should wrap infrastructure failures:

```go
if err != nil {
    return errors.Errorf("get node: %w", err)
}
```

With structured attributes (for logs / debugging):

```go
return errors.Errorf("save node: %w", err,
    errors.String("path", path),
)
```

| Helper | Type |
|--------|------|
| `errors.String(key, value)` | `string` |
| `errors.Stringer(key, value)` | `fmt.Stringer` |
| `errors.Value(key, value)` | `any` |

## Domain errors and HTTP

Domain/storage errors live in the domain packages under **`internal/`**, not in HTTP handlers as raw strings.

- Missing record: `domain.ErrNotFound` → handler checks `errors.Is(err, domain.ErrNotFound)` → **404**
- Path conflict: `domain.ErrConflict` → **409**
- Invalid path: `domain.ErrInvalidValue` → **400**
- Other wrapped errors → **500** (log with `clog.Errorf`)

Handlers use `writeError` / early returns; do not mix domain sentinels with HTTP-specific error constructors.

```go
node, err := domain.GetRecord(r.Context(), id)
if err != nil {
    if errors.Is(err, domain.ErrNotFound) {
        writeError(w, http.StatusNotFound, "node not found")
        return
    }
    clog.Errorf(r.Context(), "get node: %w", err)
    writeError(w, http.StatusInternalServerError, err.Error())
    return
}
```

When returning a domain sentinel from a handler after local checks, still prefer wrapping if the call chain started deeper:

```go
return nil, errors.Errorf("validate base: %w", ErrInvalidPath)
```

## Checking errors

```go
if errors.Is(err, domain.ErrNotFound) {
    // ...
}

if netErr, ok := errors.As[net.Error](err); ok && netErr.Timeout() {
    // ...
}
```

Use **only** `github.com/muonsoft/errors` for `Is` / `As` on chains built with `Errorf` / `Wrap`.

## Interface methods returning `error`

If a method returns `error`, **every call site must check it** — no `_, _`. Mocks must not return `nil` instead of a real error without an explicit documented contract.

**Returning `(nil, nil)` for “not found” is forbidden** — return `(nil, err)` with a sentinel checkable via `errors.Is`.

## Explicit error handling

Do not ignore errors silently. If execution continues after a failure, log with stack preserved:

```go
if err != nil {
    clog.Errorf(ctx, "optional step failed: %w", err)
}
```

See [golang-logging](../golang-logging/SKILL.md) for Error vs Warn levels.

## Rules

1. Sentinels only via `errors.New` at package scope.
2. Wrap returns with `errors.Errorf` (not `fmt.Errorf`).
3. Action-style context: `"get node"`, `"commit node"`.
4. Do not swallow errors (`_ = err` forbidden).
5. **No panic** in production paths — return `error`.
6. Reserved attribute names: do not use `id` or `message` as error parameter keys.
7. Do not log secrets in error attributes.

## Checklist

- [ ] `github.com/muonsoft/errors` used for wrap/check
- [ ] Sentinels declared at package level
- [ ] Typed errors use pointer receivers; constructors use `errors.SkipCaller()` when wrapping custom types
- [ ] Infrastructure errors wrapped with `errors.Errorf("action: %w", err)`
- [ ] Handlers map `domain.Err*` via `errors.Is` to HTTP status
- [ ] Errors logged with `clog.Errorf` and `%w` where logged
