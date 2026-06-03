package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/stretchr/testify/require"
)

func TestNewHandlerRoutes(t *testing.T) {
	t.Parallel()

	hub, err := NewHub(bus.New(0))
	require.NoError(t, err)

	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	go hub.Run(ctx)

	webRoot := filepath.Join("..", "..", "web")
	handler, err := NewHandler(Options{WebRoot: webRoot, Hub: hub})
	require.NoError(t, err)

	t.Run("health", func(t *testing.T) {
		t.Parallel()
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/health", nil))
		require.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("admin", func(t *testing.T) {
		t.Parallel()
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
		require.Equal(t, http.StatusOK, rec.Code)
		require.Contains(t, rec.Body.String(), "Chat Relay")
	})

	t.Run("overlay", func(t *testing.T) {
		t.Parallel()
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/overlay", nil))
		require.Equal(t, http.StatusOK, rec.Code)
		body := rec.Body.String()
		require.Contains(t, body, "/overlay/overlay.css")
		require.Contains(t, body, "/overlay/overlay.js")
		require.Contains(t, body, `id="messages"`)

		cssRec := httptest.NewRecorder()
		handler.ServeHTTP(cssRec, httptest.NewRequest(http.MethodGet, "/overlay/overlay.css", nil))
		require.Equal(t, http.StatusOK, cssRec.Code)
		require.Contains(t, cssRec.Body.String(), "background: transparent")
	})
}
