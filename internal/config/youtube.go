package config

import "time"

// YouTubeConfig holds YouTube Live connector and OAuth settings.
type YouTubeConfig struct {
	Enabled bool            `json:"enabled"`
	OAuth   YouTubeOAuth    `json:"oauth"`
}

// YouTubeOAuth stores Google OAuth client credentials and issued tokens.
// Tokens are persisted in config.json and must never be logged.
type YouTubeOAuth struct {
	ClientID     string    `json:"client_id"`
	ClientSecret string    `json:"client_secret,omitempty"`
	AccessToken  string    `json:"access_token,omitempty"`
	RefreshToken string    `json:"refresh_token,omitempty"`
	Expiry       time.Time `json:"expiry,omitempty"`
	TokenType    string    `json:"token_type,omitempty"`
}

// HasClientCredentials reports whether OAuth client id and secret are configured.
func (o YouTubeOAuth) HasClientCredentials() bool {
	return o.ClientID != "" && o.ClientSecret != ""
}

// HasRefreshToken reports whether the user completed OAuth at least once.
func (o YouTubeOAuth) HasRefreshToken() bool {
	return o.RefreshToken != ""
}

// Connected reports whether stored tokens can be used for API calls.
func (o YouTubeOAuth) Connected() bool {
	return o.HasRefreshToken()
}

// YouTubeOAuthPublic is the admin-safe OAuth view (no secrets or tokens).
type YouTubeOAuthPublic struct {
	ClientID        string `json:"client_id"`
	HasClientSecret bool   `json:"has_client_secret"`
	Connected       bool   `json:"connected"`
}

// YouTubeConfigPublic is the admin-safe YouTube settings view.
type YouTubeConfigPublic struct {
	Enabled bool               `json:"enabled"`
	OAuth   YouTubeOAuthPublic `json:"oauth"`
}

func (c YouTubeConfig) public() YouTubeConfigPublic {
	return YouTubeConfigPublic{
		Enabled: c.Enabled,
		OAuth: YouTubeOAuthPublic{
			ClientID:        c.OAuth.ClientID,
			HasClientSecret: c.OAuth.ClientSecret != "",
			Connected:       c.OAuth.Connected(),
		},
	}
}

// MergeYouTubeOAuthFrom copies OAuth secrets and tokens from prev when incoming fields are empty.
func (c *Config) MergeYouTubeOAuthFrom(prev Config) {
	if c.YouTube.OAuth.ClientSecret == "" {
		c.YouTube.OAuth.ClientSecret = prev.YouTube.OAuth.ClientSecret
	}
	if c.YouTube.OAuth.AccessToken == "" {
		c.YouTube.OAuth.AccessToken = prev.YouTube.OAuth.AccessToken
	}
	if c.YouTube.OAuth.RefreshToken == "" {
		c.YouTube.OAuth.RefreshToken = prev.YouTube.OAuth.RefreshToken
	}
	if c.YouTube.OAuth.TokenType == "" {
		c.YouTube.OAuth.TokenType = prev.YouTube.OAuth.TokenType
	}
	if c.YouTube.OAuth.Expiry.IsZero() {
		c.YouTube.OAuth.Expiry = prev.YouTube.OAuth.Expiry
	}
}
