---
name: golang-errors
description: Working with errors in Go using github.com/muonsoft/errors. Use when creating sentinels, wrapping with context, errors.Is/As, or mapping connector/config errors to HTTP.
---

# Errors in Go (muonsoft/errors)

Package: `github.com/muonsoft/errors` — use for `New`, `Errorf`, `Is`, `As`, `Wrap`, etc.

**Do not import the standard `errors` package** for `Is` / `As` in application code. Use **`errors.As[T](err) (T, bool)`** — not stdlib `errors.As(err, &target)`.

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

```go
var (
    ErrConnectorDisabled = errors.New("connector disabled")
    ErrNotConnected      = errors.New("not connected")
    ErrInvalidConfig     = errors.New("invalid config")
)
```

```go
return errors.Errorf("%w: platform %q", ErrConnectorDisabled, name)
```

## Wrapping on return

**Every `return ..., err`** from handlers and internal packages should wrap infrastructure failures:

```go
if err != nil {
    return errors.Errorf("twitch connect: %w", err)
}
```

With structured attributes:

```go
return errors.Errorf("save config: %w", err,
    errors.String("path", path),
)
```

## Domain errors and HTTP

- Connector/config errors live in domain packages (`internal/connector`, `internal/config`), not as raw strings in handlers.
- Handlers map via `errors.Is` → 400/404/503 as appropriate.
- Unexpected errors → 500, logged with `clog.Errorf` (see [golang-logging](../golang-logging/SKILL.md)).

```go
if errors.Is(err, config.ErrInvalidConfig) {
    writeError(w, http.StatusBadRequest, "invalid configuration")
    return
}
clog.Errorf(r.Context(), "get status: %w", err)
writeError(w, http.StatusInternalServerError, "internal error")
```

## Checking errors

```go
if errors.Is(err, connector.ErrNotConnected) {
    // ...
}
```

## Rules

1. Sentinels only via `errors.New` at package scope.
2. Wrap returns with `errors.Errorf` (not `fmt.Errorf`).
3. Action-style context: `"youtube poll"`, `"ws write"`.
4. Do not swallow errors (`_ = err` forbidden).
5. **No panic** in production paths.
6. Do not log OAuth tokens or refresh tokens in error attributes.

## Checklist

- [ ] `github.com/muonsoft/errors` used for wrap/check
- [ ] Handlers map domain sentinels via `errors.Is`
- [ ] Failures logged with `clog.Errorf` and `%w` where logged
