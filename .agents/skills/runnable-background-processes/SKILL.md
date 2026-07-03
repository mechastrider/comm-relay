---
name: runnable-background-processes
description: Background processes via pior/runnable — long-running Run(context) loops, registering in main, delays, worker logging.
---

# Background processes (runnable)

Use [pior/runnable](https://github.com/pior/runnable) (`runnable.Manager`) for graceful shutdown of long-running workers alongside the HTTP server.

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
    runnable.WithName("sync-worker", worker),
)
```

Pass a logger into context for each worker (e.g. with a `runnable` attribute) so logs are filterable.

## Worker example

```go
func (w *SyncWorker) Run(ctx context.Context) error {
    clog.Info(ctx, "sync worker: started")
    defer clog.Info(ctx, "sync worker: stopped")

    for {
        select {
        case <-ctx.Done():
            return nil
        default:
            w.tick(ctx)
        }
    }
}
```

## Delays in loops

**Do not use `time.Sleep`** for shutdown-aware waiting — it ignores cancellation.

```go
select {
case <-ctx.Done():
    return nil
case <-time.After(interval):
    // continue
}
```

## Logging in workers

Use **`clog.FromContext(ctx)`** or `clog.Info(ctx, ...)` / `clog.Errorf(ctx, "…: %w", err)`.

Do not call `slog.Info` directly in workers — you lose the shared context attributes.

## Processes vs services

- **Register** — HTTP server, workers (stopped first)
- **RegisterService** — infrastructure torn down after processes

## Related

- Background workers are typically started from bootstrap; they must respect context on shutdown
- See [golang-logging](../golang-logging/SKILL.md) for error logging in loops
