package api

import (
	"context"
	"net/http"
	"path/filepath"
	"testing"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/stretchr/testify/require"
)

func testHandler(t *testing.T) http.Handler {
	t.Helper()
	return testHandlerWithBus(t, bus.New(0))
}

func testHandlerWithBus(t *testing.T, b *bus.Bus) http.Handler {
	t.Helper()

	hub, err := NewHub(b)
	require.NoError(t, err)

	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	go hub.Run(ctx)

	store := testConfigStore(t)
	history := NewMessageHistory(0)
	go history.Run(ctx, b)

	webRoot := filepath.Join("..", "..", "web")
	handler, err := NewHandler(Options{
		WebRoot: webRoot,
		Hub:     hub,
		Store:   store,
		History: history,
	})
	require.NoError(t, err)

	return handler
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
