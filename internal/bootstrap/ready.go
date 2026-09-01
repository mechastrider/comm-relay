package bootstrap

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/muonsoft/errors"
)

type healthPayload struct {
	Status     string `json:"status"`
	InstanceID string `json:"instance_id"`
}

func waitHTTPReady(ctx context.Context, healthURL, instanceID string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	client := &http.Client{Timeout: 2 * time.Second}

	for {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, healthURL, nil)
		if err != nil {
			return errors.Errorf("create health request: %w", err)
		}

		resp, err := client.Do(req)
		if err == nil && resp.StatusCode == http.StatusOK {
			body, readErr := io.ReadAll(io.LimitReader(resp.Body, 4096))
			_ = resp.Body.Close()
			if readErr == nil {
				var payload healthPayload
				if json.Unmarshal(body, &payload) == nil &&
					payload.Status == "ok" &&
					payload.InstanceID != "" &&
					payload.InstanceID == instanceID {
					return nil
				}
			}
		} else if resp != nil {
			_ = resp.Body.Close()
		}

		if time.Now().After(deadline) {
			if instanceID != "" {
				return errors.Errorf(
					"http server not ready at %s (another CommRelay instance may already be using this port)",
					healthURL,
				)
			}
			return errors.Errorf("http server not ready at %s", healthURL)
		}

		select {
		case <-ctx.Done():
			return errors.Errorf("wait for http ready: %w", ctx.Err())
		case <-time.After(200 * time.Millisecond):
		}
	}
}
