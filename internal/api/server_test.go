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
		require.Contains(t, rec.Body.String(), `id="obs-setup-panel"`)
		require.Contains(t, rec.Body.String(), `id="obs-overlay-url"`)
		require.Contains(t, rec.Body.String(), `id="preset-island-url"`)
		require.Contains(t, rec.Body.String(), `id="overlay-preset-prompt"`)
		require.Contains(t, rec.Body.String(), `/dock/messages`)

		jsRec := httptest.NewRecorder()
		handler.ServeHTTP(jsRec, httptest.NewRequest(http.MethodGet, "/app.js", nil))
		require.Equal(t, http.StatusOK, jsRec.Code)
		require.Contains(t, jsRec.Body.String(), "initOBSSetup")
		require.Contains(t, jsRec.Body.String(), "./js/obs-setup.js")

		obsRec := httptest.NewRecorder()
		handler.ServeHTTP(obsRec, httptest.NewRequest(http.MethodGet, "/js/obs-setup.js", nil))
		require.Equal(t, http.StatusOK, obsRec.Code)
		require.Contains(t, obsRec.Body.String(), "setOBSSection")
		require.Contains(t, obsRec.Body.String(), "navigator.clipboard")
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

	t.Run("shared chat render module", func(t *testing.T) {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/shared/chat-render.js", nil))
		require.Equal(t, http.StatusOK, rec.Code)
		require.Contains(t, rec.Body.String(), "export function appendText")
		require.Contains(t, rec.Body.String(), "createChatRender")
	})

	t.Run("message dock", func(t *testing.T) {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/dock/messages", nil))
		require.Equal(t, http.StatusOK, rec.Code)
		body := rec.Body.String()
		require.Contains(t, body, "/dock/messages/messages.css")
		require.Contains(t, body, "/dock/messages/messages.js")
		require.Contains(t, body, `id="messages"`)

		cssRec := httptest.NewRecorder()
		handler.ServeHTTP(cssRec, httptest.NewRequest(http.MethodGet, "/dock/messages/messages.css", nil))
		require.Equal(t, http.StatusOK, cssRec.Code)
		require.Contains(t, cssRec.Body.String(), "color-scheme: dark")

		jsRec := httptest.NewRecorder()
		handler.ServeHTTP(jsRec, httptest.NewRequest(http.MethodGet, "/dock/messages/messages.js", nil))
		require.Equal(t, http.StatusOK, jsRec.Code)
		require.Contains(t, jsRec.Body.String(), "/api/messages/recent")
		require.Contains(t, jsRec.Body.String(), "/ws")
	})

	t.Run("streams status", func(t *testing.T) {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/streams/status", nil))
		require.Equal(t, http.StatusOK, rec.Code)
		require.Contains(t, rec.Body.String(), `"platforms"`)
	})
}
