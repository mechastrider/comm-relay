package channel

import (
	"context"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/youtube/innertube"
	"github.com/mechastrider/comm-relay/internal/youtube/videoid"
)

// ErrNoLiveStream is returned when the channel has no active live broadcast.
var ErrNoLiveStream = errors.New("no active youtube live stream on channel")

type httpDoer interface {
	Do(req *http.Request) (*http.Response, error)
}

// LiveResolver finds the active live video ID for a channel.
type LiveResolver struct {
	httpClient httpDoer
}

// NewLiveResolver creates a resolver that uses public YouTube pages.
func NewLiveResolver(client httpDoer) *LiveResolver {
	if client == nil {
		client = &http.Client{Timeout: 20 * time.Second}
	}
	return &LiveResolver{httpClient: client}
}

// ResolveLiveVideoID returns the current live video ID for a channel ref.
func (r *LiveResolver) ResolveLiveVideoID(ctx context.Context, ref Ref) (string, error) {
	pageURL := ref.LivePageURL()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, pageURL, nil)
	if err != nil {
		return "", errors.Errorf("create channel live page request: %w", err)
	}
	setResolverHeaders(req)

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return "", errors.Errorf("fetch channel live page: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", errors.Errorf("channel live page status %d", resp.StatusCode)
	}

	if resp.Request != nil && resp.Request.URL != nil {
		if id, parseErr := videoid.ParseInput(resp.Request.URL.String()); parseErr == nil {
			return id, nil
		}
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 8*1024*1024))
	if err != nil {
		return "", errors.Errorf("read channel live page: %w", err)
	}
	html := string(body)

	if canonical := canonicalWatchURL(html); canonical != "" {
		if id, parseErr := videoid.ParseInput(canonical); parseErr == nil {
			return id, nil
		}
	}

	initialData, err := innertube.ExtractInitialData(html)
	if err != nil {
		return "", errors.Errorf("parse channel live page: %w", err)
	}

	if innertube.IsLiveStreamOffline(initialData) {
		return "", ErrNoLiveStream
	}

	if id, ok := innertube.FindLiveVideoID(initialData); ok {
		return id, nil
	}

	return "", ErrNoLiveStream
}

func canonicalWatchURL(html string) string {
	marker := `rel="canonical" href="`
	start := strings.Index(html, marker)
	if start < 0 {
		return ""
	}
	start += len(marker)
	end := strings.Index(html[start:], `"`)
	if end < 0 {
		return ""
	}
	raw := html[start : start+end]
	parsed, err := url.Parse(raw)
	if err != nil {
		return ""
	}
	if !strings.Contains(parsed.Path, "/watch") {
		return ""
	}
	return raw
}

func setResolverHeaders(req *http.Request) {
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Accept", "text/html")
}
