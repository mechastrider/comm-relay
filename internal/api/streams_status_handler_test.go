package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/connector/status"
	"github.com/mechastrider/comm-relay/internal/streamstatus"
)

func TestStreamsStatus_WhenGet_ExpectThreePlatformsWithUnknownState(t *testing.T) {
	t.Parallel()

	store := testConfigStore(t)
	registry := status.NewRegistry()
	streamStore := streamstatus.NewStore(streamstatus.StoreOptions{})

	handler, err := NewHandler(Options{
		Hub:          mustTestHub(t),
		Store:        store,
		History:      NewMessageHistory(0),
		Registry:     registry,
		StreamStatus: streamStore,
	})
	require.NoError(t, err)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/streams/status", nil))
	require.Equal(t, http.StatusOK, rec.Code)

	var payload struct {
		ViewersTotal struct {
			Current *int   `json:"current"`
			Source  string `json:"source"`
		} `json:"viewers_total"`
		Platforms []struct {
			Platform string `json:"platform"`
			State    string `json:"state"`
			Viewers  struct {
				Current *int `json:"current"`
			} `json:"viewers"`
			Chat struct {
				State string `json:"state"`
			} `json:"chat"`
		} `json:"platforms"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Nil(t, payload.ViewersTotal.Current)
	require.Equal(t, "local_samples", payload.ViewersTotal.Source)
	require.Len(t, payload.Platforms, 3)
	require.Equal(t, "twitch", payload.Platforms[0].Platform)
	require.Equal(t, "youtube", payload.Platforms[1].Platform)
	require.Equal(t, "vk", payload.Platforms[2].Platform)

	for _, platform := range payload.Platforms {
		require.Equal(t, "unknown", platform.State)
		require.Nil(t, platform.Viewers.Current)
	}
}

func TestStreamsStatus_WhenConnectorConnected_ExpectChatStateOnly(t *testing.T) {
	t.Parallel()

	store := testConfigStore(t)
	updated := store.Snapshot()
	updated.Twitch.Enabled = true
	updated.Twitch.Channel = "streamer"
	require.NoError(t, store.Replace(updated))

	registry := status.NewRegistry()
	registry.SetTwitch(status.Snapshot{State: status.StateConnected})

	handler, err := NewHandler(Options{
		Hub:          mustTestHub(t),
		Store:        store,
		History:      NewMessageHistory(0),
		Registry:     registry,
		StreamStatus: streamstatus.NewStore(streamstatus.StoreOptions{}),
	})
	require.NoError(t, err)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/streams/status", nil))
	require.Equal(t, http.StatusOK, rec.Code)

	var payload struct {
		Platforms []struct {
			State string `json:"state"`
			Chat  struct {
				State string `json:"state"`
			} `json:"chat"`
		} `json:"platforms"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Equal(t, "unknown", payload.Platforms[0].State)
	require.Equal(t, "connected", payload.Platforms[0].Chat.State)
}

func mustTestHub(t *testing.T) *Hub {
	t.Helper()

	hub, err := NewHub(bus.New(0))
	require.NoError(t, err)
	return hub
}
