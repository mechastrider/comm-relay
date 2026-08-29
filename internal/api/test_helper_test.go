package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/store"
)

type testEnv struct {
	Handler     http.Handler
	Bus         *bus.Bus
	ViewerStore *store.Store
	ConfigStore *config.Store
}

func testViewerStore(t *testing.T) *store.Store {
	t.Helper()

	path := filepath.Join(t.TempDir(), "comm-relay.db")
	s, err := store.Open(path)
	require.NoError(t, err)

	return s
}

func testHandler(t *testing.T) http.Handler {
	t.Helper()
	return newTestEnv(t, bus.New(0)).Handler
}

func newTestEnv(t *testing.T, b *bus.Bus) testEnv {
	t.Helper()

	hub, err := NewHub(b)
	require.NoError(t, err)

	ctx, cancel := context.WithCancel(context.Background())

	cfgStore := testConfigStore(t)
	viewerStore := testViewerStore(t)
	history := NewMessageHistory(0)
	publisher := NewLeaderboardPublisher(hub, viewerStore, cfgStore)
	ingest := NewViewerIngest(viewerStore, cfgStore, publisher)

	go hub.Run(ctx)
	go history.Run(ctx, b)
	go ingest.Run(ctx, b)

	t.Cleanup(func() {
		cancel()
		publisher.Stop()
		require.NoError(t, viewerStore.Close())
	})

	handler, err := NewHandler(Options{
		Hub:                  hub,
		Store:                cfgStore,
		ViewerStore:          viewerStore,
		LeaderboardPublisher: publisher,
		History:              history,
	})
	require.NoError(t, err)

	return testEnv{
		Handler:     handler,
		Bus:         b,
		ViewerStore: viewerStore,
		ConfigStore: cfgStore,
	}
}

func testHandlerWithBus(t *testing.T, b *bus.Bus) http.Handler {
	t.Helper()
	return newTestEnv(t, b).Handler
}

func testConfigStore(t *testing.T) *config.Store {
	t.Helper()

	path := filepath.Join(t.TempDir(), "config.json")
	cfg, err := config.Load(path)
	require.NoError(t, err)

	store, err := config.NewStore(path, cfg)
	require.NoError(t, err)

	return store
}

func seedViewer(t *testing.T, env testEnv, platform, userID, displayName string) string {
	t.Helper()

	cfg := env.ConfigStore.Snapshot()
	require.NoError(t, env.ViewerStore.ApplyChat(store.ChatIdentity{
		Platform:    platform,
		UserID:      userID,
		DisplayName: displayName,
	}, cfg.PointsPerMessage, cfg.DayResetHour, time.Now()))

	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/viewers", nil))
	require.Equal(t, http.StatusOK, rec.Code)

	var payload struct {
		Viewers []struct {
			ID       string `json:"id"`
			LastSeen struct {
				Platform string `json:"platform"`
				UserID   string `json:"user_id"`
			} `json:"last_seen"`
		} `json:"viewers"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))

	for _, viewer := range payload.Viewers {
		if viewer.LastSeen.Platform == platform && viewer.LastSeen.UserID == userID {
			return viewer.ID
		}
	}

	require.Fail(t, "viewer identity not found", platform, userID)
	return ""
}
