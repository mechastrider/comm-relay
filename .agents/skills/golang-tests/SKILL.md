---
name: golang-tests
description: Go testing for comm-relay — API tests (muonsoft/api-testing), connector unit tests with testify. Use when writing tests for internal/ and cmd/.
---

# Go testing (comm-relay)

Cover HTTP handlers, WebSocket handshake (where practical), `internal/bus`, and `internal/connector/*`.

Detailed API examples: [references/api-tests.md](references/api-tests.md).

## One scenario per test (AAA)

```go
func TestHealthz_WhenServerUp_ExpectOK(t *testing.T) {
    t.Parallel()
    // Arrange
    mux := setupTestMux(t)

    // Act
    resp := apitest.HandleGET(t, mux, "/healthz")

    // Assert
    resp.IsOK()
}
```

## API tests (muonsoft/api-testing)

Packages: `github.com/muonsoft/api-testing/apitest`, `assertjson`.

```go
resp := apitest.HandleGET(t, mux, "/api/status")
resp.IsOK()
resp.HasJSON(func(json *assertjson.AssertJSON) {
    json.Node("twitch", "connected").IsTrue()
})
```

**assertjson paths:** variadic `Node("key", 0, "nested")`.

Custom requests: `httptest.NewRequest` + `apitest.HandleRequest(t, handler, req)`.

Use `package api_test` (black-box) for handler tests.

## Naming

```text
Test<Entity>_<Action>_When<Condition>_Expect<Result>
```

Examples: `TestWS_WhenUpgrade_Expect101`, `TestConfig_WhenMissingFile_ExpectDefaults`.

## testify

| Use | Package |
|-----|---------|
| Must stop test | `require.NoError`, `require.Error` |
| Continue on failure | `assert.Equal`, `assert.True`, `assert.ErrorIs` |

Prefer `assert.ErrorIs(t, err, target)` with muonsoft `errors.Is` at call sites under test when checking wrapped chains.

## Helpers

- Accept `testing.TB`, call `tb.Helper()` at start.
- On setup failure: `tb.Fatalf` — **no panic** in test helpers.

## Connector tests

- Fake upstream with `httptest.Server` for YouTube API shapes.
- Twitch: test message parsing and mapping to `ChatMessage` with table-driven cases.
- Bus: publish/subscribe with `context.Background()` and short timeouts.

## WebSocket tests

- Use `gorilla/websocket` client against `httptest.Server`, or test hub logic without full network when possible.
- Assert first JSON frame shape matches overlay contract.

## Mocks

- Small interfaces (`Publisher`, `Connector`) — manual mocks in `*_test.go`.
- Return errors with `errors.Errorf` for simulated failures.

## Checklist

- [ ] Changed HTTP routes have tests
- [ ] AAA + `t.Parallel()` where safe
- [ ] `TestX_WhenY_ExpectZ` naming
- [ ] JSON via `assertjson` when applicable
- [ ] Connector mapping covered for new platform fields
