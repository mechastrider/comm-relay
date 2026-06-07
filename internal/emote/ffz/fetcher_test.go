package ffz

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestFetcher_FetchGlobal_WhenValidPayload_ExpectNormalizedEmotes(t *testing.T) {
	var requestedPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestedPath = r.URL.Path
		_, _ = w.Write([]byte(`{
			"default_sets": [3],
			"sets": {
				"3": {
					"emoticons": [
						{
							"id": 757384,
							"name": "BibleThump",
							"width": 30,
							"height": 36,
							"hidden": false,
							"modifier": false,
							"urls": {"2": "https://cdn.frankerfacez.com/emote/757384/2"}
						},
						{
							"id": 720507,
							"name": "ffzHyper",
							"hidden": false,
							"modifier": true,
							"urls": {"2": "https://cdn.frankerfacez.com/emote/720507/2"}
						}
					]
				}
			}
		}`))
	}))
	t.Cleanup(server.Close)

	fetcher := New(server.Client())
	originalURL := globalSetURL
	t.Cleanup(func() { globalSetURL = originalURL })
	globalSetURL = server.URL + "/v1/set/global"

	metadata, err := fetcher.FetchGlobal(context.Background())
	require.NoError(t, err)
	require.Equal(t, "/v1/set/global", requestedPath)
	require.Len(t, metadata, 1)
	require.Equal(t, "BibleThump", metadata[0].Code)
	require.Equal(t, "757384", metadata[0].ID)
	require.Equal(t, "https://cdn.frankerfacez.com/emote/757384/2", metadata[0].URL)
}

func TestFetcher_FetchChannel_WhenRoomExists_ExpectChannelEmotes(t *testing.T) {
	var requestedPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestedPath = r.URL.Path
		_, _ = w.Write([]byte(`{
			"room": {"twitch_id": 12345, "id": "streamer", "set": 9},
			"sets": {
				"9": {
					"emoticons": [
						{
							"id": 42,
							"name": "WideHard",
							"width": 50,
							"height": 20,
							"urls": {"2": "https://cdn.frankerfacez.com/emote/42/2"}
						}
					]
				}
			}
		}`))
	}))
	t.Cleanup(server.Close)

	fetcher := New(server.Client())
	originalFmt := roomURLFmt
	t.Cleanup(func() { roomURLFmt = originalFmt })
	roomURLFmt = server.URL + "/v1/room/%s"

	metadata, err := fetcher.FetchChannel(context.Background(), "twitch", "Streamer")
	require.NoError(t, err)
	require.Equal(t, "/v1/room/streamer", requestedPath)
	require.Len(t, metadata, 1)
	require.Equal(t, "WideHard", metadata[0].Code)
}

func TestFetcher_ResolveTwitchID_WhenRoomExists_ExpectNumericID(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"room": {"twitch_id": 71092938, "id": "xqc", "set": 1}}`))
	}))
	t.Cleanup(server.Close)

	fetcher := New(server.Client())
	originalFmt := roomURLFmt
	t.Cleanup(func() { roomURLFmt = originalFmt })
	roomURLFmt = server.URL + "/v1/room/%s"

	twitchID, err := fetcher.ResolveTwitchID(context.Background(), "xqc")
	require.NoError(t, err)
	require.Equal(t, "71092938", twitchID)
}
