package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/config"
)

func TestYouTubeOAuthStartAPI_WhenConfigured_ExpectAuthorizationURL(t *testing.T) {
	t.Parallel()

	store := testConfigStore(t)
	require.NoError(t, store.Mutate(func(cfg *config.Config) error {
		cfg.YouTube.OAuth.ClientID = "client-id"
		cfg.YouTube.OAuth.ClientSecret = "client-secret"
		return nil
	}))

	var openedURL string
	handler := testYouTubeOAuthHandler(t, store, func(url string) error {
		openedURL = url
		return nil
	})

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/youtube/oauth/start", nil))

	require.Equal(t, http.StatusOK, rec.Code)

	var payload struct {
		Opened           bool   `json:"opened"`
		AuthorizationURL string `json:"authorization_url"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.True(t, payload.Opened)
	require.Contains(t, payload.AuthorizationURL, "accounts.google.com")
	require.Equal(t, payload.AuthorizationURL, openedURL)
}

func TestYouTubeOAuthStartAPI_WhenNotConfigured_ExpectServiceUnavailable(t *testing.T) {
	t.Parallel()

	handler := testYouTubeOAuthHandler(t, testConfigStore(t), func(string) error { return nil })

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/youtube/oauth/start", nil))

	require.Equal(t, http.StatusServiceUnavailable, rec.Code)
}

func TestYouTubeOAuthStart_WhenConfigured_ExpectPendingRedirectWithoutGoogleLocation(t *testing.T) {
	t.Parallel()

	store := testConfigStore(t)
	require.NoError(t, store.Mutate(func(cfg *config.Config) error {
		cfg.YouTube.OAuth.ClientID = "client-id"
		cfg.YouTube.OAuth.ClientSecret = "client-secret"
		return nil
	}))

	var openedURL string
	handler := testYouTubeOAuthHandler(t, store, func(url string) error {
		openedURL = url
		return nil
	})

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/oauth/youtube/start", nil))

	require.Equal(t, http.StatusFound, rec.Code)
	location := rec.Header().Get("Location")
	require.Contains(t, location, "oauth=pending")
	require.NotContains(t, location, "accounts.google.com")
	require.Contains(t, openedURL, "accounts.google.com")
}

func TestYouTubeOAuthCallback_WhenDenied_ExpectHTMLResultPage(t *testing.T) {
	t.Parallel()

	handler := testYouTubeOAuthHandler(t, testConfigStore(t), func(string) error { return nil })

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/oauth/youtube/callback?error=access_denied", nil))

	require.Equal(t, http.StatusOK, rec.Code)
	require.Contains(t, rec.Header().Get("Content-Type"), "text/html")
	require.Contains(t, rec.Body.String(), "denied")
}

func TestYouTubeOAuthCallback_WhenInvalidState_ExpectBadRequest(t *testing.T) {
	t.Parallel()

	handler := testYouTubeOAuthHandler(t, testConfigStore(t), func(string) error { return nil })

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/oauth/youtube/callback?code=abc&state=invalid", nil))

	require.Equal(t, http.StatusBadRequest, rec.Code)
}

func testYouTubeOAuthHandler(t *testing.T, store *config.Store, opener func(string) error) http.Handler {
	t.Helper()

	oauthState := newOAuthStateStore()
	youtubeOAuth := newYouTubeOAuthHandler(store, oauthState)
	youtubeOAuth.openURL = opener

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/youtube/oauth/start", youtubeOAuth.handleStartAPI)
	mux.HandleFunc("GET /oauth/youtube/start", youtubeOAuth.handleStart)
	mux.HandleFunc("GET /oauth/youtube/callback", youtubeOAuth.handleCallback)
	return mux
}
