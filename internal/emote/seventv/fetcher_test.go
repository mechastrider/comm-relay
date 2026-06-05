package seventv

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
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, "/v3/emote-sets/global", r.URL.Path)
		_, _ = w.Write([]byte(`{
			"emotes": [
				{
					"name": "RainTime",
					"data": {
						"id": "01FCY771D800007PQ2DF3GDTN6",
						"name": "RainTime",
						"listed": true,
						"animated": true,
						"host": {
							"url": "//cdn.7tv.app/emote/01FCY771D800007PQ2DF3GDTN6",
							"files": [
								{"name": "2x.webp", "width": 64, "height": 64}
							]
						}
					}
				},
				{
					"name": "HiddenEmote",
					"data": {
						"id": "hidden",
						"name": "HiddenEmote",
						"listed": false,
						"host": {"url": "//cdn.7tv.app/emote/hidden"}
					}
				}
			]
		}`))
	}))
	t.Cleanup(server.Close)

	fetcher := New(server.Client(), nil)
	originalURL := globalURL
	t.Cleanup(func() { globalURL = originalURL })
	globalURL = server.URL + "/v3/emote-sets/global"

	metadata, err := fetcher.FetchGlobal(context.Background())
	require.NoError(t, err)
	require.Len(t, metadata, 1)
	require.Equal(t, "RainTime", metadata[0].Code)
	require.Equal(t, "01FCY771D800007PQ2DF3GDTN6", metadata[0].ID)
	require.Equal(t, "https://cdn.7tv.app/emote/01FCY771D800007PQ2DF3GDTN6/2x.webp", metadata[0].URL)
	require.True(t, metadata[0].Animated)
	require.Equal(t, 64, metadata[0].Width)
}

func TestFetcher_FetchChannel_WhenLoginProvided_ExpectResolvedChannelEmotes(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, "/v3/users/twitch/71092938", r.URL.Path)
		_, _ = w.Write([]byte(`{
			"emote_set": {
				"emotes": [
					{
						"name": "GAMBA",
						"data": {
							"id": "01G3WEGZN0000ET2J0MQP5YJ0G",
							"name": "GAMBA",
							"listed": true,
							"animated": true,
							"host": {
								"url": "//cdn.7tv.app/emote/01G3WEGZN0000ET2J0MQP5YJ0G",
								"files": [
									{"name": "2x.webp", "width": 78, "height": 64}
								]
							}
						}
					}
				]
			}
		}`))
	}))
	t.Cleanup(server.Close)

	fetcher := New(server.Client(), stubResolver{id: "71092938"})
	originalFmt := channelURLFmt
	t.Cleanup(func() { channelURLFmt = originalFmt })
	channelURLFmt = server.URL + "/v3/users/twitch/%s"

	metadata, err := fetcher.FetchChannel(context.Background(), "twitch", "xqc")
	require.NoError(t, err)
	require.Len(t, metadata, 1)
	require.Equal(t, "GAMBA", metadata[0].Code)
	require.True(t, metadata[0].Animated)
}

func TestFetcher_FetchChannel_WhenUserNotFound_ExpectNil(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	t.Cleanup(server.Close)

	fetcher := New(server.Client(), stubResolver{id: "999"})
	originalFmt := channelURLFmt
	t.Cleanup(func() { channelURLFmt = originalFmt })
	channelURLFmt = server.URL + "/v3/users/twitch/%s"

	metadata, err := fetcher.FetchChannel(context.Background(), "twitch", "999")
	require.NoError(t, err)
	require.Nil(t, metadata)
}
