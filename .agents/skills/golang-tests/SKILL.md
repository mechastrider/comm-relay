---
name: golang-tests
description: Go testing with muonsoft/api-testing, testify, and afero — AAA scenarios, HTTP handler tests, JSON assertions, filesystem tests. Use when writing tests under internal/ and cmd/.
---

# Go testing

Cover HTTP handlers, domain packages, and the code paths they exercise.

## One scenario per test (AAA)

Use explicit sections:

```go
func TestDeleteNode_WhenExists_ExpectOK(t *testing.T) {
    t.Parallel()
    // Arrange
    handler := setupTestHandler(t)

    // Act
    resp := apitest.HandleDELETE(t, handler, "/api/nodes/topic/my-node")

    // Assert
    resp.IsOK()
    resp.HasJSON(func(json *assertjson.AssertJSON) {
        json.Node("path").IsString().EqualTo("topic/my-node")
        json.Node("deleted").IsTrue()
    })
}
```

## API tests (muonsoft/api-testing)

Packages: `github.com/muonsoft/api-testing/apitest`, `assertjson`.

```go
resp := apitest.HandleGET(t, mux, "/api/status")
resp.IsOK()

resp := apitest.HandlePOST(t, mux, "/api/commit",
    strings.NewReader(`{"message":"sync"}`),
    apitest.WithJSONContentType(),
)
resp.HasCode(503)
```

**assertjson paths:** variadic `Node("key", 0, "nested")` — not legacy `/key/0/nested`.

Custom requests: `httptest.NewRequest` + `apitest.HandleRequest(t, handler, req)`.

Use `package <pkg>_test` (black-box) for handler tests.

## Naming

```text
Test<Entity>_<Action>_When<Condition>_Expect<Result>
```

Examples: `TestGetStatus_WhenDisabled_Expect503`, `TestMoveNode_WhenConflict_Expect409`.

## testify

| Use | Package |
|-----|---------|
| Must stop test | `require.NoError`, `require.Error` |
| Continue on failure | `assert.Equal`, `assert.True`, `assert.ErrorIs` |

Prefer `assert.ErrorIs(t, err, target)` over `assert.True(t, errors.Is(...))`.

## Helpers

- Accept `testing.TB`, call `tb.Helper()` at start.
- On setup failure: `tb.Fatalf` — **no panic** in test helpers.

## Filesystem tests

### Integration-style: `t.TempDir`

Seed fixtures under `t.TempDir()` and pass the path to the code under test. This matches real on-disk layout.

### Unit tests with afero

```go
fs := afero.NewMemMapFs()
store := store.New(fs)
```

Use absolute paths with MemMapFs (`/` as base). Follow existing `seedMemFS`-style helpers for fixtures.

## Mocks

- Small interfaces — manual mocks in `*_test.go`.
- Return errors with `errors.Errorf` from muonsoft/errors for anonymous failures.

## Checklist

- [ ] Endpoints/behaviours touched have tests
- [ ] AAA structure with `t.Parallel()` where safe
- [ ] `TestX_WhenY_ExpectZ` naming
- [ ] testify `require` / `assert`, not bare `t.Fatal` except in helpers
- [ ] JSON assertions via `assertjson` + `HasJSON`
- [ ] Store/filesystem unit tests use afero when testing storage directly

## Test the claimed contract

- For branch N of a fallback chain, make every preceding branch miss. Assert both
  a successful fallback and rejection under the same setup; a success from an
  earlier stub proves nothing about the fallback.
- Fakes must expose the same domain error identity and wrapping contract as real
  repositories. Independently allocated sentinels can make unit behavior differ
  from production; cover the adapter-to-domain mapping too.
- For wire contracts such as `items: []` versus `items: null`, inspect raw JSON.
  Decoding both into an empty slice and comparing length erases the distinction.
- Test middleware-dependent behavior through the wrapped handler: auth-enabled
  routing and incremental SSE can fail while a bare handler passes. For SSE,
  observe a first event before releasing the producer to finish the response.
- Lifecycle commands need a round trip: install → clean → upstream change → dirty
  → update → clean. Include interrupted or conflicting state when the command
  claims recovery behavior.

## Environment and filesystem determinism

Isolate configuration/cache locations used by the platform, including HOME/XDG or
Windows equivalents where relevant. Use test-scoped environment setters and avoid
parallel tests when mutating process-wide environment. Do not consult real user
credentials or caches to establish an empty-state fixture.

For generic I/O failure tests, prefer structural blockers (a file where a directory
should be) or injected filesystem errors over permission bits: privileged users
and different operating systems can bypass those assumptions. Test actual permission
semantics separately when they are the contract. Register store/file cleanup before
returning helpers, especially when Windows file locking affects temporary directories.
