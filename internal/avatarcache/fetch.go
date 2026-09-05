package avatarcache

import (
	"context"
	"io"
	"net/http"
	"time"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/overlayassets"
)

const maxRedirects = 5

// Fetch downloads a validated remote avatar URL with redirect re-checks.
func Fetch(ctx context.Context, client *http.Client, rawURL string) ([]byte, error) {
	if client == nil {
		return nil, errors.New("http client is required")
	}
	if !ValidateFetchURL(rawURL) {
		return nil, errors.New("avatar fetch url rejected")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, errors.Errorf("create avatar fetch request: %w", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, errors.Errorf("fetch avatar: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, errors.Errorf("avatar fetch status %d", resp.StatusCode)
	}

	body, err := readAvatarBody(resp.Body, overlayassets.MaxViewerAvatarBytes)
	if err != nil {
		return nil, err
	}
	if err := overlayassets.ValidateViewerAvatar(body); err != nil {
		return nil, errors.Errorf("validate fetched avatar: %w", err)
	}

	return body, nil
}

func readAvatarBody(body io.Reader, maxBytes int) ([]byte, error) {
	data, err := io.ReadAll(io.LimitReader(body, int64(maxBytes)+1))
	if err != nil {
		return nil, errors.Errorf("read avatar body: %w", err)
	}
	if len(data) > maxBytes {
		return nil, errors.Errorf("avatar exceeds %d bytes", maxBytes)
	}
	if len(data) == 0 {
		return nil, errors.New("avatar body is empty")
	}
	return data, nil
}

// NewHTTPClient returns a client that re-validates every redirect target.
func NewHTTPClient(timeout time.Duration) *http.Client {
	return &http.Client{
		Timeout: timeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= maxRedirects {
				return errors.New("avatar fetch exceeded redirect limit")
			}
			if !ValidateFetchURL(req.URL.String()) {
				return errors.New("avatar fetch redirect rejected")
			}
			return nil
		},
	}
}
