package netproxy

import (
	"context"
	"net/http"
	"time"

	"golang.org/x/oauth2"

	"github.com/mechastrider/comm-relay/internal/config"
)

// OAuth2Client returns an HTTP client that attaches OAuth tokens and routes via SOCKS5 when configured.
func OAuth2Client(proxyCfg *config.SOCKS5Config, tokenSource oauth2.TokenSource) (*http.Client, error) {
	transport, err := HTTPTransport(proxyCfg)
	if err != nil {
		return nil, err
	}

	return &http.Client{
		Transport: &oauth2.Transport{
			Base:   transport,
			Source: tokenSource,
		},
	}, nil
}

// OAuth2Context returns a context that directs oauth2 exchanges through SOCKS5 when configured.
func OAuth2Context(ctx context.Context, proxyCfg *config.SOCKS5Config) (context.Context, error) {
	client, err := HTTPClient(proxyCfg, 30*time.Second)
	if err != nil {
		return nil, err
	}
	return context.WithValue(ctx, oauth2.HTTPClient, client), nil
}
