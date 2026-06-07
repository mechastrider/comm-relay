package emote

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/muonsoft/errors"
)

const maxResponseBytes = 5 * 1024 * 1024

// HTTPDoer performs outbound HTTP requests for emote providers.
type HTTPDoer interface {
	Do(req *http.Request) (*http.Response, error)
}

// NewHTTPClient returns a client suitable for provider metadata fetches.
func NewHTTPClient() *http.Client {
	return &http.Client{Timeout: 15 * time.Second}
}

// GetJSON performs a GET request and decodes a JSON response body.
func GetJSON(ctx context.Context, client HTTPDoer, url string, dest any) error {
	if client == nil {
		return errors.New("http client is nil")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return errors.Errorf("create request: %w", err)
	}
	req.Header.Set("User-Agent", "comm-relay/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return errors.Errorf("http get: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode == http.StatusNotFound {
		return ErrNotFound
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return errors.Errorf("http status %d", resp.StatusCode)
	}

	limited := io.LimitReader(resp.Body, maxResponseBytes)
	if err := json.NewDecoder(limited).Decode(dest); err != nil {
		return errors.Errorf("decode json: %w", err)
	}

	return nil
}
