package youtube

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/youtube/innertube"
)

const (
	liveChatPopoutURLPattern = "https://www.youtube.com/live_chat?is_popout=1&v=%s"
	liveChatAPIURLPattern    = "https://www.youtube.com/youtubei/v1/live_chat/get_live_chat?key=%s"
	defaultPageUserAgent     = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
	bootstrapRefreshInterval = 4 * time.Minute
	defaultPollInterval      = 5 * time.Second
)

type pageHTTPDoer interface {
	Do(req *http.Request) (*http.Response, error)
}

type pageChatClient interface {
	RunSession(ctx context.Context, videoID string, onItems func([]innertube.LiveChatItem) error) error
}

type defaultPageClient struct {
	httpClient pageHTTPDoer
}

func newDefaultPageClient() *defaultPageClient {
	return &defaultPageClient{
		httpClient: &http.Client{Timeout: 20 * time.Second},
	}
}

func (c *defaultPageClient) RunSession(ctx context.Context, videoID string, onItems func([]innertube.LiveChatItem) error) error {
	bootstrap, err := c.fetchBootstrap(ctx, videoID)
	if err != nil {
		return err
	}

	bootstrapAt := time.Now()
	pollInterval := defaultPollInterval

	for {
		if ctx.Err() != nil {
			return nil
		}

		if time.Since(bootstrapAt) >= bootstrapRefreshInterval {
			refreshed, err := c.fetchBootstrap(ctx, videoID)
			if err != nil {
				return err
			}
			bootstrap = refreshed
			bootstrapAt = time.Now()
		}

		result, err := c.fetchLiveChat(ctx, bootstrap)
		if err != nil {
			return err
		}

		if result.Offline {
			return errStreamEnded
		}

		if len(result.Items) > 0 && onItems != nil {
			if err := onItems(result.Items); err != nil {
				return err
			}
		}

		if result.Continuation != "" {
			bootstrap.Continuation = result.Continuation
		} else {
			refreshed, err := c.fetchBootstrap(ctx, videoID)
			if err != nil {
				return err
			}
			bootstrap = refreshed
			bootstrapAt = time.Now()
		}

		if result.TimeoutMs > 0 {
			pollInterval = time.Duration(result.TimeoutMs) * time.Millisecond
		}
		if pollInterval < time.Second {
			pollInterval = time.Second
		}

		if err := waitContext(ctx, pollInterval); err != nil {
			return nil
		}
	}
}

func (c *defaultPageClient) fetchBootstrap(ctx context.Context, videoID string) (innertube.LiveChatBootstrap, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fmt.Sprintf(liveChatPopoutURLPattern, videoID), nil)
	if err != nil {
		return innertube.LiveChatBootstrap{}, errors.Errorf("create live chat page request: %w", err)
	}
	setPageClientHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return innertube.LiveChatBootstrap{}, errors.Errorf("fetch live chat page: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return innertube.LiveChatBootstrap{}, errors.Errorf("live chat page status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 8*1024*1024))
	if err != nil {
		return innertube.LiveChatBootstrap{}, errors.Errorf("read live chat page: %w", err)
	}

	return innertube.ParsePageBootstrap(string(body))
}

func (c *defaultPageClient) fetchLiveChat(ctx context.Context, bootstrap innertube.LiveChatBootstrap) (innertube.LiveChatPollResult, error) {
	payload := map[string]any{
		"context": map[string]any{
			"client": map[string]any{
				"clientName":    "WEB",
				"clientVersion": bootstrap.ClientVersion,
				"hl":            "en",
				"gl":            "US",
			},
		},
		"continuation": bootstrap.Continuation,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return innertube.LiveChatPollResult{}, errors.Errorf("marshal live chat request: %w", err)
	}

	url := fmt.Sprintf(liveChatAPIURLPattern, bootstrap.APIKey)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return innertube.LiveChatPollResult{}, errors.Errorf("create live chat poll request: %w", err)
	}
	setPageClientHeaders(req)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return innertube.LiveChatPollResult{}, errors.Errorf("poll live chat: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return innertube.LiveChatPollResult{}, errors.Errorf("live chat poll status %d", resp.StatusCode)
	}

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 8*1024*1024))
	if err != nil {
		return innertube.LiveChatPollResult{}, errors.Errorf("read live chat poll response: %w", err)
	}

	result, err := innertube.ParseLiveChatPollResponse(respBody)
	if err != nil {
		return innertube.LiveChatPollResult{}, errors.Errorf("parse live chat poll response: %w", err)
	}
	return result, nil
}

func setPageClientHeaders(req *http.Request) {
	req.Header.Set("User-Agent", defaultPageUserAgent)
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Accept", "text/html,application/json")
	if origin := pageOrigin(req.URL.String()); origin != "" {
		req.Header.Set("Origin", origin)
	}
}

func pageOrigin(rawURL string) string {
	if !strings.HasPrefix(rawURL, "http") {
		return "https://www.youtube.com"
	}
	return "https://www.youtube.com"
}
