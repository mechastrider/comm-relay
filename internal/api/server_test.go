package api

import (
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
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
		require.Contains(t, rec.Body.String(), "favicon")
		require.Contains(t, rec.Body.String(), `id="root"`)
		require.NotContains(t, rec.Body.String(), "/src/main.tsx")
		assets := regexp.MustCompile(`(?:src|href)="(\./assets/[^"?]+\.(?:js|css))"`).FindAllStringSubmatch(rec.Body.String(), -1)
		require.GreaterOrEqual(t, len(assets), 2, "compiled entry must reference JS and CSS")
		for _, asset := range assets {
			assetRec := httptest.NewRecorder()
			handler.ServeHTTP(assetRec, httptest.NewRequest(http.MethodGet, "/"+strings.TrimPrefix(asset[1], "./"), nil))
			require.Equal(t, http.StatusOK, assetRec.Code, asset[1])
			require.NotEmpty(t, assetRec.Body.Bytes())
		}
		for _, path := range []string{"/app.js", "/js/obs-setup.js", "/src/main.tsx", "/package.json"} {
			legacyRec := httptest.NewRecorder()
			handler.ServeHTTP(legacyRec, httptest.NewRequest(http.MethodGet, path, nil))
			require.Equal(t, http.StatusNotFound, legacyRec.Code, path)
		}
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
		require.NotContains(t, body, `id="leaderboard"`)

		cssRec := httptest.NewRecorder()
		handler.ServeHTTP(cssRec, httptest.NewRequest(http.MethodGet, "/overlay/overlay.css", nil))
		require.Equal(t, http.StatusOK, cssRec.Code)
		require.Contains(t, cssRec.Body.String(), "background: transparent")
	})

	t.Run("alert overlay", func(t *testing.T) {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/overlay/alert", nil))
		require.Equal(t, http.StatusOK, rec.Code)
		body := rec.Body.String()
		require.Contains(t, body, `id="alert-root"`)
		require.NotContains(t, body, `id="messages"`)
		require.NotContains(t, body, `id="leaderboard"`)

		slashRec := httptest.NewRecorder()
		handler.ServeHTTP(slashRec, httptest.NewRequest(http.MethodGet, "/overlay/alert/", nil))
		require.Equal(t, http.StatusOK, slashRec.Code)

		cssRec := httptest.NewRecorder()
		handler.ServeHTTP(cssRec, httptest.NewRequest(http.MethodGet, "/overlay/alert/alert.css", nil))
		require.Equal(t, http.StatusOK, cssRec.Code)
		require.Contains(t, cssRec.Body.String(), "background: transparent")
	})

	t.Run("leaderboard overlay", func(t *testing.T) {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/overlay/leaderboard", nil))
		require.Equal(t, http.StatusOK, rec.Code)
		body := rec.Body.String()
		require.Contains(t, body, `id="leaderboard"`)
		require.NotContains(t, body, `id="messages"`)

		slashRec := httptest.NewRecorder()
		handler.ServeHTTP(slashRec, httptest.NewRequest(http.MethodGet, "/overlay/leaderboard/", nil))
		require.Equal(t, http.StatusOK, slashRec.Code)

		cssRec := httptest.NewRecorder()
		handler.ServeHTTP(cssRec, httptest.NewRequest(http.MethodGet, "/overlay/leaderboard/leaderboard.css", nil))
		require.Equal(t, http.StatusOK, cssRec.Code)
		require.Contains(t, cssRec.Body.String(), "background: transparent")
	})

	t.Run("recap overlay", func(t *testing.T) {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/overlay/recap", nil))
		require.Equal(t, http.StatusOK, rec.Code)
		body := rec.Body.String()
		require.Contains(t, body, `id="recap-root"`)
		require.NotContains(t, body, `id="messages"`)
		require.NotContains(t, body, `id="alert-root"`)

		slashRec := httptest.NewRecorder()
		handler.ServeHTTP(slashRec, httptest.NewRequest(http.MethodGet, "/overlay/recap/", nil))
		require.Equal(t, http.StatusOK, slashRec.Code)

		cssRec := httptest.NewRecorder()
		handler.ServeHTTP(cssRec, httptest.NewRequest(http.MethodGet, "/overlay/recap/recap.css", nil))
		require.Equal(t, http.StatusOK, cssRec.Code)
		require.Contains(t, cssRec.Body.String(), "background: transparent")

		jsRec := httptest.NewRecorder()
		handler.ServeHTTP(jsRec, httptest.NewRequest(http.MethodGet, "/overlay/recap/recap.js", nil))
		require.Equal(t, http.StatusOK, jsRec.Code)
		require.Contains(t, jsRec.Body.String(), "visibleRecapFromFrame")
	})

	t.Run("dedicated test overlays reuse production pages", func(t *testing.T) {
		for _, route := range []struct {
			path string
			id   string
		}{
			{path: "/overlay/test/chat", id: `id="messages"`},
			{path: "/overlay/test/leaderboard", id: `id="leaderboard"`},
			{path: "/overlay/test/alert", id: `id="alert-root"`},
		} {
			rec := httptest.NewRecorder()
			handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, route.path, nil))
			require.Equal(t, http.StatusOK, rec.Code, route.path)
			require.Contains(t, rec.Body.String(), route.id, route.path)
		}
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
}
