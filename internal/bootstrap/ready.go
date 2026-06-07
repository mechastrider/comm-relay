package bootstrap

import (
	"context"
	"net/http"
	"time"

	"github.com/muonsoft/errors"
)

func waitHTTPReady(ctx context.Context, healthURL string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	client := &http.Client{Timeout: 2 * time.Second}

	for {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, healthURL, nil)
		if err != nil {
			return errors.Errorf("create health request: %w", err)
		}

		resp, err := client.Do(req)
		if err == nil {
			_ = resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				return nil
			}
		}

		if time.Now().After(deadline) {
			return errors.Errorf("http server not ready at %s", healthURL)
		}

		select {
		case <-ctx.Done():
			return errors.Errorf("wait for http ready: %w", ctx.Err())
		case <-time.After(200 * time.Millisecond):
		}
	}
}
