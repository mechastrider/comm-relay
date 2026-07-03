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
