package streamtitle

import (
	"context"
	"encoding/json"
	"html"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"

	"github.com/muonsoft/errors"
	"golang.org/x/oauth2"

	"github.com/mechastrider/comm-relay/internal/config"
	youtubeconn "github.com/mechastrider/comm-relay/internal/connector/youtube"
	"github.com/mechastrider/comm-relay/internal/youtube/channel"
	"github.com/mechastrider/comm-relay/internal/youtube/videoid"
)

var ogTitlePattern = regexp.MustCompile(`(?i)<meta[^>]*property=["']og:title["'][^>]*>`)

func youtubeTitle(ctx context.Context, client HTTPDoer, cfg config.YouTubeConfig, accessToken string) string {
	if cfg.EffectiveConnectionMode() == config.YouTubeConnectionModeAPI && strings.TrimSpace(accessToken) != "" {
		title, err := youtubeAPITitle(ctx, client, accessToken)
		if err != nil {
			logLookupFailure(ctx, "youtube", err)
		} else if title != "" {
			return title
		}
	}
	pageURL, ok := youtubePageURL(cfg)
	if !ok {
		return ""
	}
	title, err := youtubePageTitle(ctx, client, pageURL)
	if err != nil {
		logLookupFailure(ctx, "youtube", err)
		return ""
	}
	return title
}

func youtubePageURL(cfg config.YouTubeConfig) (string, bool) {
	if id, err := videoid.ParseInput(cfg.VideoInput); err == nil {
		return "https://www.youtube.com/watch?v=" + url.QueryEscape(id), true
	}
	ref, err := channel.ParseRef(cfg.ChannelHandle)
	if err != nil {
		return "", false
	}
	return ref.LivePageURL(), true
}

func youtubeAPITitle(ctx context.Context, client HTTPDoer, accessToken string) (string, error) {
	endpoint := "https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet&broadcastStatus=active&mine=true&maxResults=1"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return "", errors.Errorf("create youtube broadcasts request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", errors.Errorf("fetch youtube broadcasts: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	payload, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", errors.Errorf("read youtube broadcasts: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return "", errors.Errorf("youtube broadcasts status %d", resp.StatusCode)
	}
	var decoded struct {
		Items []struct {
			Snippet struct {
				Title string `json:"title"`
			} `json:"snippet"`
		} `json:"items"`
	}
	if err := json.Unmarshal(payload, &decoded); err != nil {
		return "", errors.Errorf("parse youtube broadcasts: %w", err)
	}
	for _, item := range decoded.Items {
		if title := cleanTitle(item.Snippet.Title); title != "" {
			return title, nil
		}
	}
	return "", nil
}

func youtubePageTitle(ctx context.Context, client HTTPDoer, pageURL string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, pageURL, nil)
	if err != nil {
		return "", errors.Errorf("create youtube page request: %w", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Accept", "text/html")

	resp, err := client.Do(req)
	if err != nil {
		return "", errors.Errorf("fetch youtube page: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if err != nil {
		return "", errors.Errorf("read youtube page: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", errors.Errorf("youtube page status %d", resp.StatusCode)
	}
	return livePageTitle(string(body)), nil
}

func livePageTitle(page string) string {
	rest := page
	for {
		index := strings.Index(rest, `"videoDetails":`)
		if index < 0 {
			break
		}
		rest = rest[index+len(`"videoDetails":`):]
		var details struct {
			Title  string `json:"title"`
			IsLive bool   `json:"isLive"`
		}
		if err := json.NewDecoder(strings.NewReader(rest)).Decode(&details); err != nil {
			continue
		}
		if details.IsLive {
			if title := cleanTitle(details.Title); title != "" {
				return title
			}
		}
	}
	if !strings.Contains(page, `"isLive":true`) && !strings.Contains(page, "BADGE_STYLE_TYPE_LIVE_NOW") {
		return ""
	}
	return cleanTitle(stripYouTubeSuffix(ogTitle(page)))
}

func ogTitle(page string) string {
	match := ogTitlePattern.FindString(page)
	if match == "" {
		return ""
	}
	lower := strings.ToLower(match)
	key := `content="`
	start := strings.Index(lower, key)
	quote := `"`
	if start < 0 {
		key = `content='`
		start = strings.Index(lower, key)
		quote = `'`
	}
	if start < 0 {
		return ""
	}
	start += len(key)
	end := strings.Index(match[start:], quote)
	if end < 0 {
		return ""
	}
	return html.UnescapeString(match[start : start+end])
}

func stripYouTubeSuffix(title string) string {
	for _, suffix := range []string{" - YouTube", " – YouTube"} {
		title = strings.TrimSuffix(title, suffix)
	}
	return strings.TrimSpace(title)
}

// YouTubeAccessToken returns a usable access token for an enabled API-mode connection.
// An expired token is refreshed and stored. Failures return an empty token.
func YouTubeAccessToken(ctx context.Context, cfgStore *config.Store) string {
	if cfgStore == nil {
		return ""
	}
	cfg := cfgStore.Snapshot()
	yt := cfg.YouTube
	if !yt.Enabled || yt.EffectiveConnectionMode() != config.YouTubeConnectionModeAPI || !yt.OAuth.Connected() {
		return ""
	}
	current := &oauth2.Token{
		AccessToken:  yt.OAuth.AccessToken,
		RefreshToken: yt.OAuth.RefreshToken,
		TokenType:    yt.OAuth.TokenType,
		Expiry:       yt.OAuth.Expiry,
	}
	if current.Valid() {
		return current.AccessToken
	}
	oauthCfg, err := youtubeconn.OAuthConfig(cfg)
	if err != nil {
		logLookupFailure(ctx, "youtube", err)
		return ""
	}
	source := youtubeconn.NewPersistingTokenSource(cfgStore, oauthCfg, current, config.EffectiveSOCKS5(cfg.Network.SOCKS5, yt.UseProxy))
	type tokenResult struct {
		value string
		err   error
	}
	done := make(chan tokenResult, 1)
	go func() {
		token, tokenErr := source.Token()
		if tokenErr != nil || token == nil {
			done <- tokenResult{err: tokenErr}
			return
		}
		done <- tokenResult{value: token.AccessToken}
	}()
	select {
	case <-ctx.Done():
		return ""
	case result := <-done:
		if result.err != nil {
			logLookupFailure(ctx, "youtube", result.err)
			return ""
		}
		return result.value
	}
}
