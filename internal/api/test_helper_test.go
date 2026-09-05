package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/command"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/store"
)

type testEnv struct {
	Handler     http.Handler
	Bus         *bus.Bus
	ViewerStore *store.Store
	ConfigStore *config.Store
	Matcher     *command.Matcher
}

func testViewerStore(t *testing.T) *store.Store {
	t.Helper()

	path := filepath.Join(t.TempDir(), "comm-relay.db")
	s, err := store.Open(path, store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)

	return s
}

func testHandler(t *testing.T) http.Handler {
	t.Helper()
	return newTestEnv(t, bus.New(0)).Handler
}

func newTestEnv(t *testing.T, b *bus.Bus) testEnv {
	t.Helper()

	ctx, cancel := context.WithCancel(context.Background())

	cfgStore := testConfigStore(t)
	viewerStore := testViewerStore(t)
	matcher := command.NewMatcher(viewerStore)

	hub, err := NewHub(b, matcher, cfgStore, viewerStore)
	require.NoError(t, err)

	history := NewMessageHistory(0)
	history.SetViewerStore(viewerStore)
	publisher := NewLeaderboardPublisher(hub, viewerStore, cfgStore)
	ingest := NewViewerIngest(viewerStore, cfgStore, publisher, matcher, hub, nil)

	var wg sync.WaitGroup
	wg.Add(3)
	go func() {
		defer wg.Done()
		hub.Run(ctx)
	}()
	go func() {
		defer wg.Done()
		history.Run(ctx, b)
	}()
	go func() {
		defer wg.Done()
		ingest.Run(ctx, b)
	}()

	require.Eventually(t, func() bool {
		return b.SubscriberCount() >= 3
	}, time.Second, 5*time.Millisecond)

	t.Cleanup(func() {
		cancel()
		publisher.Stop()
		done := make(chan struct{})
		go func() {
			wg.Wait()
			close(done)
		}()
		select {
		case <-done:
		case <-time.After(2 * time.Second):
			t.Fatal("timed out waiting for api test runnables to stop")
		}
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
		Matcher:     matcher,
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
	}, store.ActivitySettings{
		IntervalSeconds: cfg.ActivityIntervalSeconds,
		SessionLimit:    cfg.ActivitySessionLimit,
		XP:              cfg.ActivityXP,
	}, cfg.DayResetHour, time.Now()))

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
