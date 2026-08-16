package api

import (
	"context"
	"fmt"
	"html"
	"log/slog"
	"net/http"
	"net/url"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"
	"golang.org/x/oauth2"

	"github.com/mechastrider/comm-relay/internal/browser"
	"github.com/mechastrider/comm-relay/internal/config"
	youtubeconnector "github.com/mechastrider/comm-relay/internal/connector/youtube"
	"github.com/mechastrider/comm-relay/internal/netproxy"
)

type youtubeOAuthHandler struct {
	store      *config.Store
	stateStore *oauthStateStore
	openURL    browser.Opener
}

func newYouTubeOAuthHandler(store *config.Store, stateStore *oauthStateStore) *youtubeOAuthHandler {
	return &youtubeOAuthHandler{
		store:      store,
		stateStore: stateStore,
		openURL:    browser.OpenURL,
	}
}

func (h *youtubeOAuthHandler) handleStart(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	authURL, err := h.prepareAuthURL(ctx)
	if err != nil {
		h.handleStartError(ctx, w, r, err)
		return
	}

	if openErr := h.openURL(authURL); openErr != nil {
		clog.Warn(ctx, "youtube oauth open browser failed", slog.Any("error", openErr))
		http.Redirect(w, r, adminURLWithQuery("oauth_error", "open_failed"), http.StatusFound)
		return
	}

	http.Redirect(w, r, adminURLWithQuery("oauth", "pending"), http.StatusFound)
}

func (h *youtubeOAuthHandler) handleStartAPI(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	authURL, err := h.prepareAuthURL(ctx)
	if err != nil {
		h.handleStartAPIError(ctx, w, err)
		return
	}

	opened := h.openURL(authURL) == nil
	if !opened {
		clog.Warn(ctx, "youtube oauth open browser failed")
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"opened":            opened,
		"authorization_url": authURL,
	})
}

func (h *youtubeOAuthHandler) prepareAuthURL(ctx context.Context) (string, error) {
	cfg := h.store.Snapshot()

	oauthCfg, err := youtubeconnector.OAuthConfig(cfg)
	if err != nil {
		return "", err
	}

	state, err := h.stateStore.issue()
	if err != nil {
		return "", errors.Errorf("issue oauth state: %w", err)
	}

	return oauthCfg.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.ApprovalForce), nil
}

func (h *youtubeOAuthHandler) handleStartError(ctx context.Context, w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, youtubeconnector.ErrNotConfigured) {
		clog.Warn(ctx, "youtube oauth start: not configured")
		http.Redirect(w, r, adminURLWithQuery("oauth_error", "not_configured"), http.StatusFound)
		return
	}

	clog.Errorf(ctx, "youtube oauth start: %w", err)
	writeError(w, http.StatusInternalServerError, "failed to start oauth")
}

func (h *youtubeOAuthHandler) handleStartAPIError(ctx context.Context, w http.ResponseWriter, err error) {
	if errors.Is(err, youtubeconnector.ErrNotConfigured) {
		clog.Warn(ctx, "youtube oauth start: not configured")
		writeError(w, http.StatusServiceUnavailable, "youtube oauth is not configured")
		return
	}

	clog.Errorf(ctx, "youtube oauth start: %w", err)
	writeError(w, http.StatusInternalServerError, "failed to start oauth")
}

func (h *youtubeOAuthHandler) handleCallback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	if oauthErr := r.URL.Query().Get("error"); oauthErr != "" {
		clog.Warn(ctx, "youtube oauth denied", slog.String("error", oauthErr))
		writeOAuthResultPage(w, false, "YouTube authorization was denied. You can close this tab and return to CommRelay.")
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
		writeOAuthResultPage(w, false, "YouTube OAuth is not configured in CommRelay. Close this tab and check client ID and secret in Connections.")
		return
	}

	exchangeCtx := context.Background()
	if proxyCfg := config.EffectiveSOCKS5(cfg.Network.SOCKS5, cfg.YouTube.UseProxy); proxyCfg != nil {
		var ctxErr error
		exchangeCtx, ctxErr = netproxy.OAuth2Context(exchangeCtx, proxyCfg)
		if ctxErr != nil {
			clog.Errorf(ctx, "youtube oauth exchange context: %w", ctxErr)
			writeOAuthResultPage(w, false, "YouTube token exchange failed. Close this tab and try Connect again from CommRelay.")
			return
		}
	}

	token, err := oauthCfg.Exchange(exchangeCtx, code)
	if err != nil {
		clog.Errorf(ctx, "youtube oauth token exchange failed: %w", err)
		writeOAuthResultPage(w, false, "YouTube token exchange failed. Check OAuth credentials and redirect URI, then try Connect again from CommRelay.")
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
	writeOAuthResultPage(w, true, "YouTube connected. You can close this tab and return to CommRelay.")
}

func adminURLWithQuery(key, value string) string {
	u := url.URL{Path: "/"}
	q := u.Query()
	q.Set(key, value)
	u.RawQuery = q.Encode()
	return u.String()
}

func writeOAuthResultPage(w http.ResponseWriter, success bool, message string) {
	title := "YouTube authorization"
	if success {
		title = "YouTube connected"
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = fmt.Fprintf(w, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>%s</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #111; color: #f2f2f2; margin: 0; min-height: 100vh; display: grid; place-items: center; }
    main { max-width: 32rem; padding: 2rem; border: 1px solid #333; border-radius: 12px; background: #1a1a1a; }
    h1 { margin-top: 0; font-size: 1.25rem; }
    p { line-height: 1.5; }
  </style>
</head>
<body>
  <main>
    <h1>%s</h1>
    <p>%s</p>
  </main>
</body>
</html>`,
		html.EscapeString(title),
		html.EscapeString(title),
		html.EscapeString(message),
	)
}
