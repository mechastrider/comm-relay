# API tests — comm-relay reference

## Package and imports

```go
package api_test

import (
    "net/http"
    "testing"

    "github.com/muonsoft/api-testing/apitest"
    "github.com/muonsoft/api-testing/assertjson"
    "github.com/stretchr/testify/require"
)
```

## Handler setup

```go
func setupTestMux(t *testing.T) http.Handler {
    t.Helper()
    cfg := testConfig(t)
    h, err := api.NewHandler(cfg, testBus(t))
    require.NoError(t, err)
    mux, err := api.NewMux(h)
    require.NoError(t, err)
    return mux
}
```

## GET status

```go
resp := apitest.HandleGET(t, mux, "/api/status")
resp.IsOK()
resp.HasJSON(func(json *assertjson.AssertJSON) {
    json.Node("server_port").IsNumber()
})
```

## POST with JSON body

```go
resp := apitest.HandlePOST(t, mux, "/api/config/twitch",
    strings.NewReader(`{"enabled":true,"channel":"example"}`),
    apitest.WithJSONContentType(),
)
resp.IsOK()
```

## Error response

```go
resp := apitest.HandleGET(t, mux, "/api/unknown")
resp.HasCode(http.StatusNotFound)
resp.HasJSON(func(json *assertjson.AssertJSON) {
    json.Node("error").IsString()
})
```

## Static overlay route

```go
resp := apitest.HandleGET(t, mux, "/overlay")
resp.IsOK()
// Optionally assert Content-Type text/html and body contains expected root element
```
