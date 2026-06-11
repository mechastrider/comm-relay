package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNewHandlerRoutes(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)

	t.Run("health", func(t *testing.T) {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/health", nil))
		require.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("admin", func(t *testing.T) {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
		require.Equal(t, http.StatusOK, rec.Code)
		require.Contains(t, rec.Body.String(), "CommRelay")
		require.Contains(t, rec.Body.String(), "/favicon.svg")
		require.Contains(t, rec.Body.String(), "app.js")
	})

	t.Run("favicon", func(t *testing.T) {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/favicon.svg", nil))
		require.Equal(t, http.StatusOK, rec.Code)
		require.Contains(t, rec.Body.String(), "<title>CommRelay</title>")
		require.Contains(t, rec.Body.String(), "#D4A017")
	})

	t.Run("overlay", func(t *testing.T) {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/overlay", nil))
		require.Equal(t, http.StatusOK, rec.Code)
		body := rec.Body.String()
		require.Contains(t, body, "/favicon.svg")
		require.Contains(t, body, "/overlay/overlay.css")
		require.Contains(t, body, "/overlay/overlay.js")
		require.Contains(t, body, `id="messages"`)

		cssRec := httptest.NewRecorder()
		handler.ServeHTTP(cssRec, httptest.NewRequest(http.MethodGet, "/overlay/overlay.css", nil))
		require.Equal(t, http.StatusOK, cssRec.Code)
		require.Contains(t, cssRec.Body.String(), "background: transparent")
	})
}
