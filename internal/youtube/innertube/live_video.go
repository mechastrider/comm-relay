package innertube

import (
	"encoding/json"
	"strings"

	"github.com/mechastrider/comm-relay/internal/youtube/videoid"
)

// IsLiveStreamOffline reports whether ytInitialData indicates no active live stream.
func IsLiveStreamOffline(initialData []byte) bool {
	var root any
	if err := json.Unmarshal(initialData, &root); err != nil {
		return false
	}
	return findLiveOffline(root)
}

// FindLiveVideoID extracts a live video ID from channel live page ytInitialData.
func FindLiveVideoID(initialData []byte) (string, bool) {
	var root any
	if err := json.Unmarshal(initialData, &root); err != nil {
		return "", false
	}
	id := findLiveVideoID(root)
	return id, id != ""
}

func findLiveOffline(value any) bool {
	switch typed := value.(type) {
	case map[string]any:
		if renderer, ok := typed["liveStreamabilityRenderer"].(map[string]any); ok {
			if offline, ok := renderer["offlineSlate"].(map[string]any); ok && len(offline) > 0 {
				return true
			}
		}
		if banner, ok := typed["liveChatOfflineBannerRenderer"].(map[string]any); ok && len(banner) > 0 {
			return true
		}
		if status, ok := typed["playabilityStatus"].(map[string]any); ok {
			if strings.EqualFold(stringField(status, "status"), "LIVE_STREAM_OFFLINE") {
				return true
			}
		}
		for _, nested := range typed {
			if findLiveOffline(nested) {
				return true
			}
		}
	case []any:
		for _, item := range typed {
			if findLiveOffline(item) {
				return true
			}
		}
	}
	return false
}

func findLiveVideoID(value any) string {
	switch typed := value.(type) {
	case map[string]any:
		if endpoint, ok := typed["currentVideoEndpoint"].(map[string]any); ok {
			if id := watchEndpointVideoID(endpoint); id != "" {
				return id
			}
		}
		if endpoint, ok := typed["watchEndpoint"].(map[string]any); ok {
			if id := watchEndpointVideoID(endpoint); id != "" {
				return id
			}
		}
		if details, ok := typed["videoDetails"].(map[string]any); ok {
			if isTruthy(details["isLive"]) {
				if id, err := videoid.ParseInput(stringField(details, "videoId")); err == nil {
					return id
				}
			}
		}
		if renderer, ok := typed["videoRenderer"].(map[string]any); ok {
			if badges, ok := renderer["badges"].([]any); ok && hasLiveBadge(badges) {
				if id, err := videoid.ParseInput(stringField(renderer, "videoId")); err == nil {
					return id
				}
			}
		}
		for _, nested := range typed {
			if id := findLiveVideoID(nested); id != "" {
				return id
			}
		}
	case []any:
		for _, item := range typed {
			if id := findLiveVideoID(item); id != "" {
				return id
			}
		}
	}
	return ""
}

func watchEndpointVideoID(endpoint map[string]any) string {
	if watch, ok := endpoint["watchEndpoint"].(map[string]any); ok {
		if id, err := videoid.ParseInput(stringField(watch, "videoId")); err == nil {
			return id
		}
	}
	if id, err := videoid.ParseInput(stringField(endpoint, "videoId")); err == nil {
		return id
	}
	return ""
}

func hasLiveBadge(badges []any) bool {
	for _, badge := range badges {
		obj, ok := badge.(map[string]any)
		if !ok {
			continue
		}
		renderer, ok := obj["metadataBadgeRenderer"].(map[string]any)
		if !ok {
			continue
		}
		label := strings.ToUpper(stringField(renderer, "label"))
		style := strings.ToUpper(stringField(renderer, "style"))
		if strings.Contains(label, "LIVE") || style == "BADGE_STYLE_TYPE_LIVE_NOW" {
			return true
		}
	}
	return false
}

func isTruthy(value any) bool {
	typed, ok := value.(bool)
	return ok && typed
}
