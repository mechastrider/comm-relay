package ytemoji

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/emote"
	"github.com/mechastrider/comm-relay/internal/youtube/innertube"
)

const (
	globalEmojiURLPattern = "https://www.gstatic.com/youtube/img/emojis/emojis-svg-%d.json"
	globalEmojiFileCount  = 9
	liveChatPopoutURL     = "https://www.youtube.com/live_chat?is_popout=1&v=%s"
)

type emojiRecord struct {
	EmojiID   string   `json:"emojiId"`
	Shortcuts []string `json:"shortcuts"`
	Image     struct {
		Thumbnails []struct {
			URL string `json:"url"`
		} `json:"thumbnails"`
	} `json:"image"`
}

// FetchGlobal loads standard YouTube emoji shortcuts from gstatic JSON catalogs.
func FetchGlobal(ctx context.Context, client emote.HTTPDoer) (map[string]Entry, error) {
	if client == nil {
		return nil, errors.New("http client is nil")
	}

	merged := defaultLiveChatEntries()
	var mu sync.Mutex
	var wg sync.WaitGroup
	errCh := make(chan error, globalEmojiFileCount)

	for i := 0; i < globalEmojiFileCount; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()

			url := fmt.Sprintf(globalEmojiURLPattern, index)
			entries, err := fetchEmojiFile(ctx, client, url)
			if err != nil {
				if errors.Is(err, emote.ErrNotFound) {
					return
				}
				errCh <- errors.Errorf("fetch youtube emoji file %d: %w", index, err)
				return
			}

			mu.Lock()
			for shortcut, entry := range entries {
				merged[shortcut] = entry
			}
			mu.Unlock()
		}(i)
	}

	wg.Wait()
	close(errCh)

	for err := range errCh {
		if err != nil {
			return nil, err
		}
	}

	if len(merged) == 0 {
		return nil, errors.New("youtube global emoji catalog is empty")
	}

	return merged, nil
}

// FetchChannel loads channel-specific emoji shortcuts from the live chat popout page.
func FetchChannel(ctx context.Context, client emote.HTTPDoer, videoID string) (map[string]Entry, error) {
	if client == nil {
		return nil, errors.New("http client is nil")
	}

	videoID = strings.TrimSpace(videoID)
	if videoID == "" {
		return nil, errors.New("video id is empty")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fmt.Sprintf(liveChatPopoutURL, videoID), nil)
	if err != nil {
		return nil, errors.Errorf("create live chat request: %w", err)
	}
	req.Header.Set("User-Agent", "CommRelay/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, errors.Errorf("fetch live chat page: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, errors.Errorf("live chat page status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 8*1024*1024))
	if err != nil {
		return nil, errors.Errorf("read live chat page: %w", err)
	}

	initialData, err := innertube.ExtractInitialData(string(body))
	if err != nil {
		return nil, err
	}

	records, err := parseEmojiRecords(initialData)
	if err != nil {
		return nil, err
	}

	return recordsToEntries(records), nil
}

func fetchEmojiFile(ctx context.Context, client emote.HTTPDoer, url string) (map[string]Entry, error) {
	var records []emojiRecord
	if err := emote.GetJSON(ctx, client, url, &records); err != nil {
		return nil, err
	}
	return recordsToEntries(records), nil
}

func recordsToEntries(records []emojiRecord) map[string]Entry {
	out := make(map[string]Entry)
	for _, record := range records {
		url := firstThumbnailURL(record.Image.Thumbnails)
		if url == "" {
			continue
		}
		id := strings.TrimSpace(record.EmojiID)
		if id == "" {
			id = url
		}
		entry := Entry{
			ID:     id,
			URL:    url,
			Width:  DefaultWidth,
			Height: DefaultHeight,
		}
		for _, shortcut := range record.Shortcuts {
			shortcut = strings.TrimSpace(shortcut)
			if shortcut == "" {
				continue
			}
			out[shortcut] = entry
		}
	}
	return out
}

func firstThumbnailURL(thumbs []struct {
	URL string `json:"url"`
}) string {
	for _, thumb := range thumbs {
		url := strings.TrimSpace(thumb.URL)
		if url != "" {
			return url
		}
	}
	return ""
}

func parseEmojiRecords(initialData []byte) ([]emojiRecord, error) {
	var root map[string]json.RawMessage
	if err := json.Unmarshal(initialData, &root); err != nil {
		return nil, errors.Errorf("decode ytInitialData: %w", err)
	}

	if records, ok := emojiRecordsFromPath(root, "contents", "liveChatRenderer", "emojis"); ok {
		return records, nil
	}

	if records, ok := findEmojiRecords(root); ok {
		return records, nil
	}

	return nil, nil
}

func emojiRecordsFromPath(root map[string]json.RawMessage, keys ...string) ([]emojiRecord, bool) {
	current := any(root)
	for _, key := range keys {
		obj, ok := current.(map[string]json.RawMessage)
		if !ok {
			return nil, false
		}
		raw, ok := obj[key]
		if !ok {
			return nil, false
		}
		if key == keys[len(keys)-1] {
			var records []emojiRecord
			if err := json.Unmarshal(raw, &records); err != nil {
				return nil, false
			}
			return records, true
		}
		var next map[string]json.RawMessage
		if err := json.Unmarshal(raw, &next); err != nil {
			return nil, false
		}
		current = next
	}
	return nil, false
}

func findEmojiRecords(value any) ([]emojiRecord, bool) {
	switch typed := value.(type) {
	case map[string]json.RawMessage:
		if raw, ok := typed["emojis"]; ok {
			var records []emojiRecord
			if err := json.Unmarshal(raw, &records); err == nil && len(records) > 0 {
				return records, true
			}
		}
		for _, raw := range typed {
			var nested any
			if err := json.Unmarshal(raw, &nested); err != nil {
				continue
			}
			if records, ok := findEmojiRecords(nested); ok {
				return records, true
			}
		}
	case []any:
		for _, item := range typed {
			if records, ok := findEmojiRecords(item); ok {
				return records, true
			}
		}
	case map[string]any:
		if raw, ok := typed["emojis"]; ok {
			data, err := json.Marshal(raw)
			if err != nil {
				return nil, false
			}
			var records []emojiRecord
			if err := json.Unmarshal(data, &records); err == nil && len(records) > 0 {
				return records, true
			}
		}
		for _, nested := range typed {
			if records, ok := findEmojiRecords(nested); ok {
				return records, true
			}
		}
	}
	return nil, false
}
