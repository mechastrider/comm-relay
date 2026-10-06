package streamtitle

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"

	"github.com/muonsoft/errors"
)

var vkSlugPattern = regexp.MustCompile(`^[a-z0-9_-]{1,64}$`)

func vkTitle(ctx context.Context, client HTTPDoer, channel string) string {
	slug := strings.TrimPrefix(strings.ToLower(strings.TrimSpace(channel)), "@")
	slug = strings.Trim(slug, "/")
	if !vkSlugPattern.MatchString(slug) {
		return ""
	}
	endpoint := "https://api.live.vkvideo.ru/v1/blog/" + url.PathEscape(slug) + "/public_video_stream"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return ""
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Origin", "https://live.vkvideo.ru")
	req.Header.Set("User-Agent", "CommRelay")

	resp, err := client.Do(req)
	if err != nil {
		logLookupFailure(ctx, "vk", err)
		return ""
	}
	defer func() { _ = resp.Body.Close() }()
	payload, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		logLookupFailure(ctx, "vk", err)
		return ""
	}
	if resp.StatusCode != http.StatusOK {
		logLookupFailure(ctx, "vk", errors.Errorf("status %d", resp.StatusCode))
		return ""
	}
	return vkTitleFromBody(payload)
}

func vkTitleFromBody(payload []byte) string {
	var decoded struct {
		Title    string `json:"title"`
		IsOnline *bool  `json:"isOnline"`
	}
	if err := json.Unmarshal(payload, &decoded); err != nil {
		return ""
	}
	title := decoded.Title
	online := decoded.IsOnline
	if online == nil {
		var wrapped struct {
			Data struct {
				Title    string `json:"title"`
				IsOnline *bool  `json:"isOnline"`
			} `json:"data"`
		}
		if err := json.Unmarshal(payload, &wrapped); err != nil {
			return ""
		}
		title = wrapped.Data.Title
		online = wrapped.Data.IsOnline
	}
	if online == nil || !*online {
		return ""
	}
	return cleanTitle(title)
}
