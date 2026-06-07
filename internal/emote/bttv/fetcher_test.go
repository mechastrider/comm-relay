package bttv

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
)

type stubResolver struct {
	id  string
	err error
}

func (s stubResolver) ResolveTwitchID(ctx context.Context, login string) (string, error) {
	if s.err != nil {
		return "", s.err
	}
	return s.id, nil
}

func TestFetcher_FetchGlobal_WhenValidPayload_ExpectNormalizedEmotes(t *testing.T) {
	var requestedPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestedPath = r.URL.Path
		_, _ = w.Write([]byte(`[
			{
				"id": "566c9fc265dbbdab32ec053b",
				"code": "FeelsBadMan",
				"imageType": "png",
				"animated": false,
				"modifier": false,
				"width": 28,
				"height": 28
			},
			{
				"id": "6468f7acaee1f7f47567708e",
				"code": "c!",
				"imageType": "png",
				"modifier": true
			}
		]`))
	}))
	t.Cleanup(server.Close)

	fetcher := New(server.Client(), nil)
	originalURL := globalURL
	t.Cleanup(func() { globalURL = originalURL })
	globalURL = server.URL + "/3/cached/emotes/global"

	metadata, err := fetcher.FetchGlobal(context.Background())
	require.NoError(t, err)
	require.Equal(t, "/3/cached/emotes/global", requestedPath)
	require.Len(t, metadata, 1)
	require.Equal(t, "FeelsBadMan", metadata[0].Code)
	require.Equal(t, "https://cdn.betterttv.net/emote/566c9fc265dbbdab32ec053b/2x", metadata[0].URL)
}

func TestFetcher_FetchChannel_WhenLoginProvided_ExpectResolvedChannelEmotes(t *testing.T) {
	var requestedPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestedPath = r.URL.Path
		_, _ = w.Write([]byte(`{
			"channelEmotes": [
				{
					"id": "abc123",
					"code": "ChannelEmote",
					"imageType": "png"
				}
			],
			"sharedEmotes": [
				{
					"id": "def456",
					"code": "SharedEmote",
					"imageType": "gif",
					"animated": true
				}
			]
		}`))
	}))
	t.Cleanup(server.Close)

	fetcher := New(server.Client(), stubResolver{id: "71092938"})
	originalFmt := channelURLFmt
	t.Cleanup(func() { channelURLFmt = originalFmt })
	channelURLFmt = server.URL + "/3/cached/users/twitch/%s"

	metadata, err := fetcher.FetchChannel(context.Background(), "twitch", "xqc")
	require.NoError(t, err)
	require.Equal(t, "/3/cached/users/twitch/71092938", requestedPath)
	require.Len(t, metadata, 2)
	require.Equal(t, "ChannelEmote", metadata[0].Code)
	require.Equal(t, "SharedEmote", metadata[1].Code)
	require.True(t, metadata[1].Animated)
}
