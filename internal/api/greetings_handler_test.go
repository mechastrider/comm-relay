package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
)

func TestGreetings_WhenFreshStore_ExpectFixedDisabledCatalog(t *testing.T) {
	t.Parallel()
	env := newTestEnv(t, bus.New(0))
	recorder := httptest.NewRecorder()
	env.Handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/api/greetings", nil))
	require.Equal(t, http.StatusOK, recorder.Code)
	assert.Contains(t, recorder.Body.String(), `"id":"new_viewer"`)
	assert.Contains(t, recorder.Body.String(), `"id":"returning_viewer"`)
	assert.Contains(t, recorder.Body.String(), `"enabled":false`)
}

func TestGreetings_WhenPreviewDraft_ExpectNoPersistentUpdate(t *testing.T) {
	t.Parallel()
	env := newTestEnv(t, bus.New(0))
	preview := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/greetings/preview", strings.NewReader(`{"id":"new_viewer","enabled":true,"splash_template":"Hi {viewer}","sound":"","duration_ms":5000,"sound_volume":70,"layout":"card","image_fit":"contain","image_size_pct":100}`))
	request.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(preview, request)
	require.Equal(t, http.StatusOK, preview.Code)
	assert.Contains(t, preview.Body.String(), `"delivered_clients":0`)

	list := httptest.NewRecorder()
	env.Handler.ServeHTTP(list, httptest.NewRequest(http.MethodGet, "/api/greetings", nil))
	assert.Contains(t, list.Body.String(), `"enabled":false`)
}

func TestGreetings_WhenPreviewDraft_ExpectDebugAudienceOnly(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	production := &wsClient{hub: env.Hub, send: make(chan []byte, ClientSendBuffer)}
	debug := &wsClient{hub: env.Hub, send: make(chan []byte, ClientSendBuffer), debug: true}
	env.Hub.register(production)
	env.Hub.register(debug)
	<-debug.send // initial overlay settings snapshot

	preview := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/greetings/preview", strings.NewReader(`{"id":"new_viewer","enabled":true,"splash_template":"Hi {viewer}","sound":"","duration_ms":5000,"sound_volume":70,"layout":"card","image_fit":"contain","image_size_pct":100}`))
	request.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(preview, request)

	require.Equal(t, http.StatusOK, preview.Code)
	var response greetingPreviewResponse
	require.NoError(t, json.Unmarshal(preview.Body.Bytes(), &response))
	require.Equal(t, 1, response.DeliveredClients)
	frame := decodeFrame(t, <-debug.send)
	require.Equal(t, wireAlertType, frame["type"])
	require.Equal(t, "greeting", frame["source"])
	for {
		select {
		case payload := <-production.send:
			productionFrame := decodeFrame(t, payload)
			require.NotEqual(t, "greeting", productionFrame["source"], "production must not receive a greeting preview")
		default:
			return
		}
	}
}

func TestGreetings_WhenUnsafeAsset_ExpectFieldError(t *testing.T) {
	t.Parallel()
	env := newTestEnv(t, bus.New(0))
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/greetings/update", strings.NewReader(`{"id":"new_viewer","enabled":true,"splash_template":"Hi","sound":"","duration_ms":5000,"image_asset":"https://bad.example/a.png","sound_volume":70,"layout":"card","image_fit":"contain","image_size_pct":100}`))
	request.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(recorder, request)
	require.Equal(t, http.StatusBadRequest, recorder.Code)
	assert.Contains(t, recorder.Body.String(), `"image_asset"`)
}
