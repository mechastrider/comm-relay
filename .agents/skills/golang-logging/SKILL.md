---
name: golang-logging
description: Contextual logging in Go with github.com/muonsoft/clog. Use when adding logs, binding loggers to context, or logging errors with preserved stack traces.
---

# Logging in Go (muonsoft/clog)

Package: `github.com/muonsoft/clog` (built on `log/slog`).

Levels: Debug, Info, Warn, Error — same as product spec in `docs/concept.md`.

## Context API

| Function | Purpose |
|----------|---------|
| `clog.NewContext(ctx, logger)` | Bind `*slog.Logger` to context (middleware / main) |
| `clog.FromContext(ctx)` | Extract logger from context |
| `clog.Info(ctx, msg, args...)` | Info — shorthand when logger not stored locally |
| `clog.Warn(ctx, msg, args...)` | Warning |
| `clog.Debug(ctx, msg, args...)` | Debug |
| `clog.Error(ctx, msg, ...slog.Attr)` | Error with attributes |
| `clog.Errorf(ctx, format, ...any)` | Error with `%w` for `error` values (preserves stack) |

Prefer `clog.Info(ctx, ...)` / `clog.Errorf(ctx, ...)` over calling `FromContext` repeatedly unless you need the logger for many calls in one function.

### Bootstrap (main)

```go
level := slog.LevelInfo
if cfg.Debug {
    level = slog.LevelDebug
}
handler := slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: level})
logger := slog.New(handler)
slog.SetDefault(logger)
```

JSON handler only when users need log aggregation; default to text for local streaming.

### HTTP middleware

```go
logger := slog.Default().With(
    slog.String("request_method", r.Method),
    slog.String("request_url", r.URL.Path),
)
ctx := clog.NewContext(r.Context(), logger)
next.ServeHTTP(w, r.WithContext(ctx))
```

### Connector / worker context

```go
logger := slog.Default().With(
    slog.String("platform", "twitch"),
    slog.String("channel", channel),
)
ctx := clog.NewContext(ctx, logger)
```

## slog attributes

```go
slog.String("platform", "youtube")
slog.String("channel", channel)
slog.Int("message_count", n)
slog.Bool("connected", true)
```

Pass `platform`, `channel`, `client_id` (non-secret), etc. as structured fields — not only inside the message string.

## Logging errors

**Use `clog.Errorf` with `%w`** — not `clog.Error` + `slog.String("error", err.Error())`:

```go
// Wrong — loses stack
clog.Error(ctx, "youtube poll failed", slog.String("error", err.Error()))

// Correct
clog.Errorf(ctx, "youtube poll failed: %w", err)
```

### Error vs Warn

| Level | When |
|-------|------|
| **Error** (`clog.Errorf`) | Connector auth failure, IRC/API disconnect after retries, config corrupt, WebSocket write failure |
| **Warn** | Reconnect attempt, YouTube quota soft limit, slow overlay consumer |
| **Debug** | Expected 400 on bad config, ping/pong, per-tick poll (when noisy) |

When unsure, prefer **Error** so real bugs are not hidden.

### Handler pattern

```go
if errors.Is(err, config.ErrInvalidConfig) {
    clog.Debug(r.Context(), "bad config", "platform", platform)
    writeError(w, http.StatusBadRequest, "invalid configuration")
    return
}
clog.Errorf(r.Context(), "get status: %w", err)
writeError(w, http.StatusInternalServerError, "internal error")
```

## Connectors and loops

```go
func (c *Twitch) Run(ctx context.Context) error {
    clog.Info(ctx, "worker started")
    defer clog.Info(ctx, "worker stopped")

    for {
        select {
        case <-ctx.Done():
            return nil
        default:
            if err := c.read(ctx); err != nil {
                if ctx.Err() != nil {
                    return nil
                }
                clog.Errorf(ctx, "worker read: %w", err)
                // backoff …
            }
        }
    }
}
```

## What to log (product)

- Platform connect / disconnect
- Auth and network errors
- Message receive statistics (counts, not full message bodies at Info)
- Never: OAuth tokens, refresh tokens, client secrets, `code=` in URLs

## Rules

1. Do not log passwords, tokens, or session secrets.
2. Always pass `context.Context` as the first argument to `clog.*`.
3. Business logic in `internal/` uses **`clog` only** — do not add `*slog.Logger` fields to domain types; bind logger into context at the edge (`main`, HTTP middleware, worker `Run`).
4. Errors: `clog.Errorf` with `%w`, or `slog.*` attributes for non-error fields.
5. Do not duplicate attributes already on the request context logger.
6. Do not call `slog.Info` / `slog.Default()` directly in `internal/` packages.

## Checklist

- [ ] `github.com/muonsoft/clog` used in `internal/` and handlers
- [ ] Logger bound with `clog.NewContext` at request/worker boundary
- [ ] Failures logged with `clog.Errorf` and `%w`
- [ ] No sensitive data in log fields
- [ ] No ad-hoc `slog.Default()` in business packages
