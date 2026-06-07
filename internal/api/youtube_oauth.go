package api

import (
	"context"
	"log/slog"
	"net/http"
	"net/url"

	"github.com/muonsoft/clog"
	"golang.org/x/oauth2"

	"github.com/mechastrider/comm-relay/internal/config"
	youtubeconnector "github.com/mechastrider/comm-relay/internal/connector/youtube"
)

type youtubeOAuthHandler struct {
	store      *config.Store
	stateStore *oauthStateStore
}

func newYouTubeOAuthHandler(store *config.Store, stateStore *oauthStateStore) *youtubeOAuthHandler {
	return &youtubeOAuthHandler{store: store, stateStore: stateStore}
}

func (h *youtubeOAuthHandler) handleStart(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cfg := h.store.Snapshot()

	oauthCfg, err := youtubeconnector.OAuthConfig(cfg)
	if err != nil {
		clog.Warn(ctx, "youtube oauth start: not configured")
		http.Redirect(w, r, adminURLWithQuery("oauth_error", "not_configured"), http.StatusFound)
		return
	}

	state, err := h.stateStore.issue()
	if err != nil {
		clog.Errorf(ctx, "youtube oauth state: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to start oauth")
		return
	}

	authURL := oauthCfg.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.ApprovalForce)
	http.Redirect(w, r, authURL, http.StatusFound)
}

func (h *youtubeOAuthHandler) handleCallback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	if oauthErr := r.URL.Query().Get("error"); oauthErr != "" {
		clog.Warn(ctx, "youtube oauth denied", slog.String("error", oauthErr))
		http.Redirect(w, r, adminURLWithQuery("oauth_error", "denied"), http.StatusFound)
		return
	}

	state := r.URL.Query().Get("state")
	if !h.stateStore.consume(state) {
		clog.Warn(ctx, "youtube oauth callback: invalid state")
		writeError(w, http.StatusBadRequest, "invalid oauth state")
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		writeError(w, http.StatusBadRequest, "missing authorization code")
		return
	}

	cfg := h.store.Snapshot()
	oauthCfg, err := youtubeconnector.OAuthConfig(cfg)
	if err != nil {
		clog.Warn(ctx, "youtube oauth callback: not configured")
		http.Redirect(w, r, adminURLWithQuery("oauth_error", "not_configured"), http.StatusFound)
		return
	}

	token, err := oauthCfg.Exchange(context.Background(), code)
	if err != nil {
		clog.Errorf(ctx, "youtube oauth token exchange failed: %w", err)
		http.Redirect(w, r, adminURLWithQuery("oauth_error", "exchange_failed"), http.StatusFound)
		return
	}

	if err := h.store.Mutate(func(cfg *config.Config) error {
		cfg.YouTube.OAuth.AccessToken = token.AccessToken
		if token.RefreshToken != "" {
			cfg.YouTube.OAuth.RefreshToken = token.RefreshToken
		}
		cfg.YouTube.OAuth.TokenType = token.TokenType
		cfg.YouTube.OAuth.Expiry = token.Expiry
		return nil
	}); err != nil {
		clog.Errorf(ctx, "youtube oauth save tokens: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to save tokens")
		return
	}

	clog.Info(ctx, "youtube oauth connected")
	http.Redirect(w, r, adminURLWithQuery("oauth", "success"), http.StatusFound)
}

func adminURLWithQuery(key, value string) string {
	u := url.URL{Path: "/"}
	q := u.Query()
	q.Set(key, value)
	u.RawQuery = q.Encode()
	return u.String()
}
