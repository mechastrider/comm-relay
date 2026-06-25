package innertube

import (
	"encoding/json"
	"strings"
)

// LiveChatPollResult is a parsed InnerTube live chat poll response.
type LiveChatPollResult struct {
	Items        []LiveChatItem
	Continuation string
	TimeoutMs    int
	Offline      bool
}

// LiveChatItem is a normalized live chat message from a page poll response.
type LiveChatItem struct {
	ID            string
	UserID        string
	DisplayName   string
	Message       string
	MessageText   string
	AvatarURL     string
	Badges        []string
	TimestampUsec string
}

// ParseLiveChatPollResponse extracts chat items and the next continuation from an InnerTube response.
func ParseLiveChatPollResponse(body []byte) (LiveChatPollResult, error) {
	var root map[string]json.RawMessage
	if err := json.Unmarshal(body, &root); err != nil {
		return LiveChatPollResult{}, err
	}

	result := LiveChatPollResult{}
	var nested any
	if err := json.Unmarshal(body, &nested); err != nil {
		return LiveChatPollResult{}, err
	}

	result.Items = findChatItems(nested)
	if continuation, timeout, ok := findPollContinuation(nested); ok {
		result.Continuation = continuation
		result.TimeoutMs = timeout
	}
	result.Offline = findOfflineBanner(nested)

	return result, nil
}

func findChatItems(value any) []LiveChatItem {
	var items []LiveChatItem
	collectChatItems(value, &items)
	return items
}

func collectChatItems(value any, items *[]LiveChatItem) {
	switch typed := value.(type) {
	case map[string]any:
		if renderer, ok := typed["liveChatTextMessageRenderer"].(map[string]any); ok {
			if item, ok := mapTextMessageRenderer(renderer); ok {
				*items = append(*items, item)
			}
		}
		if renderer, ok := typed["liveChatPaidMessageRenderer"].(map[string]any); ok {
			if item, ok := mapPaidMessageRenderer(renderer); ok {
				*items = append(*items, item)
			}
		}
		for _, nested := range typed {
			collectChatItems(nested, items)
		}
	case []any:
		for _, item := range typed {
			collectChatItems(item, items)
		}
	}
}

func mapTextMessageRenderer(renderer map[string]any) (LiveChatItem, bool) {
	message, messageText := textFromRuns(renderer["message"])
	if strings.TrimSpace(message) == "" {
		return LiveChatItem{}, false
	}

	item := LiveChatItem{
		ID:            stringField(renderer, "id"),
		UserID:        stringField(renderer, "authorExternalChannelId"),
		DisplayName:   simpleText(renderer["authorName"]),
		Message:       message,
		MessageText:   messageText,
		AvatarURL:     thumbnailURL(renderer["authorPhoto"]),
		Badges:        badgesFromRenderer(renderer),
		TimestampUsec: stringField(renderer, "timestampUsec"),
	}
	if item.DisplayName == "" {
		item.DisplayName = item.UserID
	}
	return item, true
}

func mapPaidMessageRenderer(renderer map[string]any) (LiveChatItem, bool) {
	message, messageText := textFromRuns(renderer["message"])
	amount := simpleText(renderer["purchaseAmountText"])
	if amount != "" {
		if message != "" {
			message = amount + " " + message
		} else {
			message = amount
		}
		if messageText != "" {
			messageText = amount + " " + messageText
		} else {
			messageText = amount
		}
	}
	if strings.TrimSpace(message) == "" {
		return LiveChatItem{}, false
	}

	item := LiveChatItem{
		ID:            stringField(renderer, "id"),
		UserID:        stringField(renderer, "authorExternalChannelId"),
		DisplayName:   simpleText(renderer["authorName"]),
		Message:       message,
		MessageText:   messageText,
		AvatarURL:     thumbnailURL(renderer["authorPhoto"]),
		Badges:        badgesFromRenderer(renderer),
		TimestampUsec: stringField(renderer, "timestampUsec"),
	}
	if item.DisplayName == "" {
		item.DisplayName = item.UserID
	}
	return item, true
}

func badgesFromRenderer(renderer map[string]any) []string {
	var badges []string
	if boolField(renderer, "isChatOwner") {
		badges = append(badges, "owner")
	}
	if boolField(renderer, "isChatModerator") {
		badges = append(badges, "moderator")
	}
	if boolField(renderer, "isVerified") {
		badges = append(badges, "verified")
	}
	if boolField(renderer, "isChatSponsor") {
		badges = append(badges, "member")
	}

	rawBadges, ok := renderer["authorBadges"].([]any)
	if !ok {
		return badges
	}
	for _, raw := range rawBadges {
		badgeObj, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		rendererObj, ok := badgeObj["liveChatAuthorBadgeRenderer"].(map[string]any)
		if !ok {
			continue
		}
		iconType := ""
		if icon, ok := rendererObj["icon"].(map[string]any); ok {
			iconType = strings.ToUpper(stringField(icon, "iconType"))
		}
		switch iconType {
		case "OWNER":
			badges = appendUniqueBadge(badges, "owner")
		case "MODERATOR":
			badges = appendUniqueBadge(badges, "moderator")
		case "VERIFIED":
			badges = appendUniqueBadge(badges, "verified")
		case "MEMBER":
			badges = appendUniqueBadge(badges, "member")
		}
	}
	return badges
}

func appendUniqueBadge(badges []string, badge string) []string {
	for _, existing := range badges {
		if existing == badge {
			return badges
		}
	}
	return append(badges, badge)
}

func findPollContinuation(value any) (string, int, bool) {
	switch typed := value.(type) {
	case map[string]any:
		if data, ok := typed["timedContinuationData"].(map[string]any); ok {
			token := stringField(data, "continuation")
			timeout := intField(data, "timeoutMs")
			if token != "" {
				return token, timeout, true
			}
		}
		if token := stringField(typed, "continuation"); token != "" {
			return token, 0, true
		}
		for _, nested := range typed {
			if token, timeout, ok := findPollContinuation(nested); ok {
				return token, timeout, true
			}
		}
	case []any:
		for _, item := range typed {
			if token, timeout, ok := findPollContinuation(item); ok {
				return token, timeout, true
			}
		}
	}
	return "", 0, false
}

func findOfflineBanner(value any) bool {
	switch typed := value.(type) {
	case map[string]any:
		if _, ok := typed["liveChatOfflineBannerRenderer"]; ok {
			return true
		}
		for _, nested := range typed {
			if findOfflineBanner(nested) {
				return true
			}
		}
	case []any:
		for _, item := range typed {
			if findOfflineBanner(item) {
				return true
			}
		}
	}
	return false
}

func textFromRuns(value any) (display string, raw string) {
	obj, ok := value.(map[string]any)
	if !ok {
		return "", ""
	}
	runs, ok := obj["runs"].([]any)
	if !ok {
		return simpleText(obj), simpleText(obj)
	}

	var parts []string
	for _, run := range runs {
		runObj, ok := run.(map[string]any)
		if !ok {
			continue
		}
		if text := runText(runObj); text != "" {
			parts = append(parts, text)
			continue
		}
		if emoji, ok := runObj["emoji"].(map[string]any); ok {
			if shortcut := shortcutFromEmoji(emoji); shortcut != "" {
				parts = append(parts, shortcut)
			} else if text := simpleText(emoji["image"]); text != "" {
				parts = append(parts, text)
			}
		}
	}
	joined := strings.Join(parts, "")
	return joined, joined
}

func runText(run map[string]any) string {
	raw, ok := run["text"]
	if !ok {
		return ""
	}
	text, ok := raw.(string)
	if !ok {
		return ""
	}
	return text
}

func shortcutFromEmoji(emoji map[string]any) string {
	if shortcut := stringField(emoji, "shortcut"); shortcut != "" {
		return shortcut
	}

	if rawShortcuts, ok := emoji["shortcuts"].([]any); ok {
		for _, raw := range rawShortcuts {
			shortcut, ok := raw.(string)
			if !ok {
				continue
			}
			shortcut = strings.TrimSpace(shortcut)
			if shortcut != "" {
				return shortcut
			}
		}
	}

	emojiID := stringField(emoji, "emojiId")
	if strings.HasPrefix(emojiID, ":") && strings.HasSuffix(emojiID, ":") {
		return emojiID
	}

	return ""
}

func simpleText(value any) string {
	obj, ok := value.(map[string]any)
	if !ok {
		return ""
	}
	return stringField(obj, "simpleText")
}

func thumbnailURL(value any) string {
	obj, ok := value.(map[string]any)
	if !ok {
		return ""
	}
	thumbs, ok := obj["thumbnails"].([]any)
	if !ok {
		return ""
	}
	for _, thumb := range thumbs {
		thumbObj, ok := thumb.(map[string]any)
		if !ok {
			continue
		}
		if url := stringField(thumbObj, "url"); url != "" {
			return url
		}
	}
	return ""
}

func stringField(obj map[string]any, key string) string {
	raw, ok := obj[key]
	if !ok {
		return ""
	}
	switch typed := raw.(type) {
	case string:
		return strings.TrimSpace(typed)
	case json.Number:
		return typed.String()
	default:
		return ""
	}
}

func boolField(obj map[string]any, key string) bool {
	raw, ok := obj[key]
	if !ok {
		return false
	}
	typed, ok := raw.(bool)
	return ok && typed
}

func intField(obj map[string]any, key string) int {
	raw, ok := obj[key]
	if !ok {
		return 0
	}
	switch typed := raw.(type) {
	case float64:
		return int(typed)
	case json.Number:
		n, err := typed.Int64()
		if err != nil {
			return 0
		}
		return int(n)
	default:
		return 0
	}
}
