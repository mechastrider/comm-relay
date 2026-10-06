package streamtitle_test

import (
	"context"
	"io"
	"net/http"
	"strings"
	"sync"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/streamtitle"
)

type scriptedClient struct {
	mu     sync.Mutex
	bodies map[string]string
	status map[string]int
	seen   []string
}

func (c *scriptedClient) Do(req *http.Request) (*http.Response, error) {
	c.mu.Lock()
	c.seen = append(c.seen, req.URL.Host+req.URL.Path)
	c.mu.Unlock()
	key := req.URL.Host
	status := c.status[key]
	if status == 0 {
		status = http.StatusOK
	}
	body := c.bodies[key]
	return &http.Response{
		StatusCode: status,
		Body:       io.NopCloser(strings.NewReader(body)),
		Header:     make(http.Header),
		Request:    req,
	}, nil
}

func TestSuggest_WhenSeveralPlatformsAreLive_ExpectTwitchThenYouTubeThenVK(t *testing.T) {
	client := &scriptedClient{bodies: map[string]string{
		"gql.twitch.tv":       `{"data":{"user":{"stream":{"title":"Twitch night"}}}}`,
		"www.googleapis.com":  `{"items":[{"snippet":{"title":"YouTube night"}}]}`,
		"www.youtube.com":     `{"videoDetails":{"title":"Page night","isLive":true}}`,
		"api.live.vkvideo.ru": `{"title":"VK night","isOnline":true,"data":[]}`,
	}}
	cfg := config.Config{}
	cfg.Twitch.Enabled = true
	cfg.Twitch.Channel = "Example"
	cfg.YouTube.Enabled = true
	cfg.YouTube.ConnectionMode = config.YouTubeConnectionModeAPI
	cfg.YouTube.ChannelHandle = "@example"
	cfg.VK.Enabled = true
	cfg.VK.Channel = "example"

	suggestion := streamtitle.Suggest(context.Background(), cfg, streamtitle.Options{
		Client:             client,
		YouTubeAccessToken: "token",
	})
	require.Equal(t, "Twitch night", suggestion.Title)
	require.Equal(t, "twitch", suggestion.Platform)

	cfg.Twitch.Enabled = false
	suggestion = streamtitle.Suggest(context.Background(), cfg, streamtitle.Options{
		Client:             client,
		YouTubeAccessToken: "token",
	})
	require.Equal(t, "YouTube night", suggestion.Title)
	require.Equal(t, "youtube", suggestion.Platform)
	client.mu.Lock()
	seen := append([]string(nil), client.seen...)
	client.mu.Unlock()
	for _, path := range seen {
		require.NotContains(t, path, "www.youtube.com")
	}

	cfg.YouTube.ConnectionMode = config.YouTubeConnectionModePage
	suggestion = streamtitle.Suggest(context.Background(), cfg, streamtitle.Options{Client: client})
	require.Equal(t, "Page night", suggestion.Title)

	cfg.YouTube.Enabled = false
	client.bodies["api.live.vkvideo.ru"] = `{"title":"Ended","isOnline":false,"data":[]}`
	suggestion = streamtitle.Suggest(context.Background(), cfg, streamtitle.Options{Client: client})
	require.Empty(t, suggestion.Title)
	require.Empty(t, suggestion.Platform)

	client.bodies["api.live.vkvideo.ru"] = `{"data":{"title":"  VK night\n","isOnline":true}}`
	suggestion = streamtitle.Suggest(context.Background(), cfg, streamtitle.Options{Client: client})
	require.Equal(t, "VK night", suggestion.Title)
	require.Equal(t, "vk", suggestion.Platform)
}

func TestSuggest_WhenYouTubePageUsesOpenGraph_ExpectLiveTitle(t *testing.T) {
	page := `<meta property="og:title" content="Raid &amp; chill - YouTube"><script>"isLive":true</script>`
	client := &scriptedClient{bodies: map[string]string{"www.youtube.com": page}}
	cfg := config.Config{}
	cfg.YouTube.Enabled = true
	cfg.YouTube.ConnectionMode = config.YouTubeConnectionModePage
	cfg.YouTube.VideoInput = "abcdefghijk"

	suggestion := streamtitle.Suggest(context.Background(), cfg, streamtitle.Options{Client: client})
	require.Equal(t, "Raid & chill", suggestion.Title)
	require.Equal(t, "youtube", suggestion.Platform)
}

func TestSuggest_WhenPlatformRequestFails_ExpectNextTitle(t *testing.T) {
	client := &scriptedClient{
		bodies: map[string]string{
			"gql.twitch.tv":       `nope`,
			"api.live.vkvideo.ru": `{"title":"VK only","isOnline":true}`,
		},
		status: map[string]int{"gql.twitch.tv": http.StatusForbidden},
	}
	cfg := config.Config{}
	cfg.Twitch.Enabled = true
	cfg.Twitch.Channel = "example"
	cfg.VK.Enabled = true
	cfg.VK.Channel = "example"

	suggestion := streamtitle.Suggest(context.Background(), cfg, streamtitle.Options{Client: client})
	require.Equal(t, "VK only", suggestion.Title)
	require.Equal(t, "vk", suggestion.Platform)
}
