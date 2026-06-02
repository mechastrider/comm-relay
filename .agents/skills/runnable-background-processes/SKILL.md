---
name: runnable-background-processes
description: Long-running connectors and workers via pior/runnable. Use when implementing Twitch/YouTube connectors, WebSocket hub lifecycle, or graceful shutdown in cmd/chat-relay.
---

# Background processes (runnable)

Use [pior/runnable](https://github.com/pior/runnable) (`runnable.Manager`) for graceful shutdown alongside the HTTP server.

## Runnable interface

```go
type Runnable interface {
    Run(context.Context) error
}
```

`Run` blocks until `ctx` is cancelled. On shutdown, the manager cancels context and waits for workers.

## Registering in main

```go
m.Register(
    runnable.HTTPServer(srv).ShutdownTimeout(30*time.Second),
    runnable.WithName("twitch", twitchConnector),
    runnable.WithName("youtube", youtubeConnector),
)
```

## Connector loop pattern

```go
func (c *Twitch) Run(ctx context.Context) error {
    clog.Info(ctx, "connector starting", slog.String("platform", "twitch"))
    defer clog.Info(ctx, "connector stopped", slog.String("platform", "twitch"))

    for {
        if err := c.connectAndRead(ctx); err != nil {
            if ctx.Err() != nil {
                return nil
            }
            clog.Errorf(ctx, "connector error: %w", err)
            if err := waitBackoff(ctx, c.backoff); err != nil {
                return nil
            }
            continue
        }
    }
}
```

## Delays in loops

**Do not use `time.Sleep`** for shutdown-aware waiting.

```go
select {
case <-ctx.Done():
    return nil
case <-time.After(interval):
    // continue
}
```

Use exponential backoff with a cap for reconnects.

## Logging in workers

Use **`clog.FromContext(ctx)`** or `clog.Info(ctx, ...)` / `clog.Errorf(ctx, ...)` in workers. Bind `platform` and `channel` on the logger in `bootstrap` via `clog.NewContext` before starting the connector. Do not call `slog.Info` directly in `internal/`.

## Chat Relay specifics

| Runnable | Role |
|----------|------|
| HTTP server | Admin + overlay static + API |
| `connector/twitch` | IRC/EventSub read loop |
| `connector/youtube` | Live Chat polling loop |
| WebSocket hub (optional) | May run inside HTTP server or as separate runnable if it has its own loop |

One connector crashing its loop should reconnect, not take down other runnables.

## Related

- [golang-logging](../golang-logging/SKILL.md)
- [chat-relay](../chat-relay/SKILL.md) — reliability requirements
