package youtube

import (
	"context"
	"fmt"

	"github.com/mechastrider/comm-relay/internal/config"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

const (
	platformYouTube = "youtube"
	oauthScope      = "https://www.googleapis.com/auth/youtube.readonly"
)

// OAuthConfig builds a Google OAuth2 config from persisted settings and server port.
func OAuthConfig(cfg config.Config) (*oauth2.Config, error) {
	oauth := cfg.YouTube.OAuth
	if !oauth.HasClientCredentials() {
		return nil, errNotConfigured
	}

	redirectURL, err := redirectURL(cfg.ServerPort)
	if err != nil {
		return nil, err
	}

	return &oauth2.Config{
		ClientID:     oauth.ClientID,
		ClientSecret: oauth.ClientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{oauthScope},
		Endpoint:     google.Endpoint,
	}, nil
}

func redirectURL(serverPort int) (string, error) {
	if serverPort < 1 || serverPort > 65535 {
		return "", fmt.Errorf("invalid server_port %d", serverPort)
	}
	return fmt.Sprintf("http://127.0.0.1:%d/oauth/youtube/callback", serverPort), nil
}

func tokenFromConfig(oauth config.YouTubeOAuth) *oauth2.Token {
	if oauth.AccessToken == "" && oauth.RefreshToken == "" {
		return nil
	}

	return &oauth2.Token{
		AccessToken:  oauth.AccessToken,
		RefreshToken: oauth.RefreshToken,
		TokenType:    oauth.TokenType,
		Expiry:       oauth.Expiry,
	}
}

func applyToken(oauth *config.YouTubeOAuth, token *oauth2.Token) {
	if token == nil {
		return
	}
	oauth.AccessToken = token.AccessToken
	if token.RefreshToken != "" {
		oauth.RefreshToken = token.RefreshToken
	}
	oauth.TokenType = token.TokenType
	oauth.Expiry = token.Expiry
}

// PersistingTokenSource saves refreshed tokens back to the config store.
type PersistingTokenSource struct {
	store *config.Store
	base  oauth2.TokenSource
}

// NewPersistingTokenSource wraps a token source that writes refreshed tokens to disk.
func NewPersistingTokenSource(store *config.Store, oauthCfg *oauth2.Config, token *oauth2.Token) *PersistingTokenSource {
	return &PersistingTokenSource{
		store: store,
		base:  oauthCfg.TokenSource(context.Background(), token),
	}
}

// Token returns a valid access token, persisting refreshes to config.
func (p *PersistingTokenSource) Token() (*oauth2.Token, error) {
	token, err := p.base.Token()
	if err != nil {
		return nil, err
	}

	if err := p.store.Mutate(func(cfg *config.Config) error {
		applyToken(&cfg.YouTube.OAuth, token)
		return nil
	}); err != nil {
		return nil, err
	}

	return token, nil
}
