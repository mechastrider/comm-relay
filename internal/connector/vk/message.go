package vk

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/mechastrider/comm-relay/internal/bus"
)

const platformVK = "vk"

type wsChatMessage struct {
	Push struct {
		Pub struct {
			Data struct {
				Type string `json:"type"`
				Data struct {
					ID        int64 `json:"id"`
					CreatedAt int64 `json:"createdAt"`
					Author    struct {
						ID                 int64  `json:"id"`
						DisplayName        string `json:"displayName"`
						IsChatModerator    bool   `json:"isChatModerator"`
						IsChannelModerator bool   `json:"isChannelModerator"`
						AvatarURL          string `json:"avatarUrl"`
						Roles              []struct {
							Name string `json:"name"`
						} `json:"roles"`
					} `json:"author"`
					Data []contentBlock `json:"data"`
				} `json:"data"`
			} `json:"data"`
		} `json:"pub"`
	} `json:"push"`
}

type contentBlock struct {
	Type        string `json:"type"`
	Content     string `json:"content"`
	DisplayName string `json:"displayName"`
}

// MapWSMessage converts a VK Live WebSocket chat payload to the unified chat model.
func MapWSMessage(raw []byte) (bus.ChatMessage, bool) {
	var msg wsChatMessage
	if err := json.Unmarshal(raw, &msg); err != nil {
		return bus.ChatMessage{}, false
	}

	if msg.Push.Pub.Data.Type != "message" {
		return bus.ChatMessage{}, false
	}

	payload := msg.Push.Pub.Data.Data
	text := extractMessageText(payload.Data)
	text = strings.TrimSpace(text)
	if text == "" {
		return bus.ChatMessage{}, false
	}

	ts := time.Unix(payload.CreatedAt, 0).UTC()
	if payload.CreatedAt == 0 {
		ts = time.Now().UTC()
	}

	id := strconv.FormatInt(payload.ID, 10)
	if id == "0" {
		id = fmt.Sprintf("vk-%d-%s", payload.Author.ID, ts.Format(time.RFC3339Nano))
	}

	displayName := strings.TrimSpace(payload.Author.DisplayName)
	if displayName == "" {
		displayName = strconv.FormatInt(payload.Author.ID, 10)
	}

	return bus.ChatMessage{
		ID:          id,
		Platform:    platformVK,
		UserID:      strconv.FormatInt(payload.Author.ID, 10),
		Username:    displayName,
		DisplayName: displayName,
		Message:     text,
		AvatarURL:   strings.TrimSpace(payload.Author.AvatarURL),
		Badges:      authorBadges(payload.Author),
		Timestamp:   ts,
	}, true
}

func extractMessageText(blocks []contentBlock) string {
	var b strings.Builder
	for _, block := range blocks {
		switch block.Type {
		case "text":
			b.WriteString(parseTextContent(block.Content))
		case "mention":
			name := strings.TrimSpace(block.DisplayName)
			if name != "" {
				b.WriteString("@")
				b.WriteString(name)
			}
		}
	}
	return b.String()
}

func parseTextContent(content string) string {
	content = strings.TrimSpace(content)
	if content == "" {
		return ""
	}
	if !strings.HasPrefix(content, "[") {
		return content
	}

	var raw []json.RawMessage
	if err := json.Unmarshal([]byte(content), &raw); err != nil || len(raw) == 0 {
		return content
	}

	var first string
	if err := json.Unmarshal(raw[0], &first); err != nil {
		return content
	}

	if vkStructuredTextPayload(raw) {
		return first
	}

	var parts []string
	allStrings := true
	for _, item := range raw {
		var part string
		if err := json.Unmarshal(item, &part); err != nil {
			allStrings = false
			break
		}
		parts = append(parts, part)
	}
	if allStrings {
		return strings.Join(parts, "")
	}

	return first
}

// vkStructuredTextPayload detects [text, style, attachments?] payloads from VK Live chat.
func vkStructuredTextPayload(raw []json.RawMessage) bool {
	if len(raw) < 2 {
		return false
	}

	var style string
	if err := json.Unmarshal(raw[1], &style); err != nil || !isVkTextStyle(style) {
		return false
	}

	if len(raw) >= 3 {
		var nested []json.RawMessage
		if json.Unmarshal(raw[2], &nested) == nil {
			return true
		}
		var obj map[string]json.RawMessage
		if json.Unmarshal(raw[2], &obj) == nil {
			return true
		}
	}

	return true
}

func isVkTextStyle(style string) bool {
	switch style {
	case "unstyled", "styled":
		return true
	default:
		return false
	}
}

func authorBadges(author struct {
	ID                 int64  `json:"id"`
	DisplayName        string `json:"displayName"`
	IsChatModerator    bool   `json:"isChatModerator"`
	IsChannelModerator bool   `json:"isChannelModerator"`
	AvatarURL          string `json:"avatarUrl"`
	Roles              []struct {
		Name string `json:"name"`
	} `json:"roles"`
}) []string {
	var badges []string
	if author.IsChannelModerator {
		badges = append(badges, "moderator")
	}
	if author.IsChatModerator {
		badges = append(badges, "chat_moderator")
	}
	for _, role := range author.Roles {
		name := strings.TrimSpace(role.Name)
		if name != "" {
			badges = append(badges, name)
		}
	}
	return badges
}

func normalizeChannel(channel string) string {
	channel = strings.TrimSpace(channel)
	channel = strings.TrimPrefix(channel, "@")
	channel = strings.TrimPrefix(channel, "/")
	return strings.ToLower(channel)
}
