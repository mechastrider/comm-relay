package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/connector/status"
	"github.com/mechastrider/comm-relay/internal/emote"
	"github.com/mechastrider/comm-relay/internal/runtime"
	"github.com/stretchr/testify/require"
)

func TestDiagnostics_WhenGet_ExpectRuntimeFields(t *testing.T) {
	t.Parallel()

	b := bus.New(0)
	hub, err := NewHub(b)
	require.NoError(t, err)

	store := testConfigStore(t)
	updated := store.Snapshot()
	updated.Twitch.Enabled = true
	updated.Twitch.Channel = "streamer"
	require.NoError(t, store.Replace(updated))

	registry := status.NewRegistry()
	registry.SetTwitch(status.Snapshot{
		State:        status.StateConnected,
		MessageCount: 3,
	})

	rt := runtime.NewInfo()
	time.Sleep(10 * time.Millisecond)

	emoteCache := emote.New(emote.Options{})

	handler, err := NewHandler(Options{
		Hub:        hub,
		Store:      store,
		History:    NewMessageHistory(0),
		Registry:   registry,
		Runtime:    rt,
		EmoteCache: emoteCache,
	})
	require.NoError(t, err)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/diagnostics", nil))

	require.Equal(t, http.StatusOK, rec.Code)

	var payload struct {
		UptimeSeconds     int64             `json:"uptime_seconds"`
		WebSocketClients  int               `json:"websocket_clients"`
		EnabledConnectors []string          `json:"enabled_connectors"`
		MessageCounts     map[string]uint64 `json:"message_counts"`
		Connectors        struct {
			Twitch struct {
				State        string `json:"state"`
				MessageCount uint64 `json:"message_count"`
			} `json:"twitch"`
		} `json:"connectors"`
		EmoteCache struct {
			TotalEntries int            `json:"total_entries"`
			TotalScopes  int            `json:"total_scopes"`
			Providers    map[string]any `json:"providers"`
		} `json:"emote_cache"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.GreaterOrEqual(t, payload.UptimeSeconds, int64(0))
	require.Equal(t, 0, payload.WebSocketClients)
	require.Equal(t, "connected", payload.Connectors.Twitch.State)
	require.Equal(t, uint64(3), payload.Connectors.Twitch.MessageCount)
	require.NotNil(t, payload.EmoteCache.Providers)
}
