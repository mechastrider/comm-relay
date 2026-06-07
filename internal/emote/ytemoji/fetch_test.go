package ytemoji

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestFetchGlobal_WhenCatalogAvailable_ExpectShortcuts(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/youtube/img/emojis/emojis-svg-0.json":
			_, _ = w.Write([]byte(`[{
				"emojiId": "heart",
				"shortcuts": [":heart:"],
				"image": {"thumbnails": [{"url": "https://example.com/heart.svg"}]}
			}]`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client := server.Client()
	origPattern := globalEmojiURLPattern
	t.Cleanup(func() {
		// globalEmojiURLPattern is const; tests use direct fetchEmojiFile instead.
		_ = origPattern
	})

	entries, err := fetchEmojiFile(context.Background(), client, server.URL+"/youtube/img/emojis/emojis-svg-0.json")
	require.NoError(t, err)
	require.Contains(t, entries, ":heart:")
	require.Equal(t, "https://example.com/heart.svg", entries[":heart:"].URL)
}

func TestNewCatalog_WhenDefaultLiveChatEmoji_ExpectShortcut(t *testing.T) {
	t.Parallel()

	catalog := NewCatalog()

	entry, ok := catalog.Lookup(":face-blue-smiling:")
	require.True(t, ok)
	require.NotEmpty(t, entry.URL)
	require.Equal(t, DefaultWidth, entry.Width)
	require.Equal(t, DefaultHeight, entry.Height)
	require.True(t, catalog.NeedsGlobalRefresh(time.Now()))
}

func TestExtractYTInitialData_WhenPopoutPage_ExpectJSON(t *testing.T) {
	t.Parallel()

	html := `<html><script>window["ytInitialData"] = {"contents":{"liveChatRenderer":{"emojis":[]}}};</script></html>`
	data, err := extractYTInitialData(html)
	require.NoError(t, err)
	require.JSONEq(t, `{"contents":{"liveChatRenderer":{"emojis":[]}}}`, string(data))
}

func TestParseEmojiRecords_WhenLiveChatRendererPresent_ExpectRecords(t *testing.T) {
	t.Parallel()

	initialData := []byte(`{
		"contents": {
			"liveChatRenderer": {
				"emojis": [{
					"emojiId": "blobcat",
					"shortcuts": [":blobcat:"],
					"image": {"thumbnails": [{"url": "https://example.com/blobcat.png"}]}
				}]
			}
		}
	}`)

	records, err := parseEmojiRecords(initialData)
	require.NoError(t, err)
	require.Len(t, records, 1)
	require.Equal(t, ":blobcat:", records[0].Shortcuts[0])
}

func TestFetchChannel_WhenPopoutContainsEmojis_ExpectShortcuts(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`<html><script>var ytInitialData = {
			"contents": {
				"liveChatRenderer": {
					"emojis": [{
						"emojiId": "member",
						"shortcuts": [":member:"],
						"image": {"thumbnails": [{"url": "https://example.com/member.png"}]}
					}]
				}
			}
		};</script></html>`))
	}))
	defer server.Close()

	client := server.Client()
	entries, err := fetchChannelFromURL(context.Background(), client, server.URL)
	require.NoError(t, err)
	require.Contains(t, entries, ":member:")
}

func fetchChannelFromURL(ctx context.Context, client *http.Client, pageURL string) (map[string]Entry, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, pageURL, nil)
	if err != nil {
		return nil, err
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 8*1024*1024))
	if err != nil {
		return nil, err
	}

	initialData, err := extractYTInitialData(string(body))
	if err != nil {
		return nil, err
	}
	records, err := parseEmojiRecords(initialData)
	if err != nil {
		return nil, err
	}
	return recordsToEntries(records), nil
}
