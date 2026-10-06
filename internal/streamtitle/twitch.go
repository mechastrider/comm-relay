package streamtitle

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"regexp"
	"strings"

	"github.com/muonsoft/errors"
)

const (
	twitchGQLURL = "https://gql.twitch.tv/gql"
	// twitchWebClientID is the public Twitch website client id. Guest GraphQL is best-effort
	// and is not a stable third-party contract; failures leave the title field empty.
	twitchWebClientID = "kimne78kx3ncx6brgo4mv6wki5h1ko"
)

var twitchLoginPattern = regexp.MustCompile(`^[a-z0-9_]{1,25}$`)

func twitchTitle(ctx context.Context, client HTTPDoer, channel string) string {
	login := strings.TrimPrefix(strings.ToLower(strings.TrimSpace(channel)), "#")
	if !twitchLoginPattern.MatchString(login) {
		return ""
	}
	body, err := json.Marshal(map[string]any{
		"query":     `query StreamTitle($login:String!){user(login:$login){stream{title}}}`,
		"variables": map[string]string{"login": login},
	})
	if err != nil {
		return ""
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, twitchGQLURL, bytes.NewReader(body))
	if err != nil {
		return ""
	}
	req.Header.Set("Client-ID", twitchWebClientID)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "CommRelay")

	resp, err := client.Do(req)
	if err != nil {
		logLookupFailure(ctx, "twitch", err)
		return ""
	}
	defer func() { _ = resp.Body.Close() }()
	payload, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		logLookupFailure(ctx, "twitch", err)
		return ""
	}
	if resp.StatusCode != http.StatusOK {
		logLookupFailure(ctx, "twitch", errors.Errorf("status %d", resp.StatusCode))
		return ""
	}
	var decoded struct {
		Data struct {
			User *struct {
				Stream *struct {
					Title string `json:"title"`
				} `json:"stream"`
			} `json:"user"`
		} `json:"data"`
	}
	if err := json.Unmarshal(payload, &decoded); err != nil {
		logLookupFailure(ctx, "twitch", err)
		return ""
	}
	if decoded.Data.User == nil || decoded.Data.User.Stream == nil {
		return ""
	}
	return cleanTitle(decoded.Data.User.Stream.Title)
}
