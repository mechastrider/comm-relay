package api

import (
	"encoding/json"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/muonsoft/errors"
)

const wireMessageType = "message"

// wireChatMessage is the JSON payload sent to overlay WebSocket clients.
type wireChatMessage struct {
	Type        string   `json:"type"`
	Platform    string   `json:"platform"`
	User        string   `json:"user"`
	Message     string   `json:"message"`
	DisplayName string   `json:"display_name,omitempty"`
	AvatarURL   string   `json:"avatar_url,omitempty"`
	Badges      []string `json:"badges,omitempty"`
}

func chatMessageWirePayload(msg bus.ChatMessage) ([]byte, error) {
	user := msg.Username
	if msg.DisplayName != "" {
		user = msg.DisplayName
	}

	wire := wireChatMessage{
		Type:        wireMessageType,
		Platform:    msg.Platform,
		User:        user,
		Message:     msg.Message,
		DisplayName: msg.DisplayName,
		AvatarURL:   msg.AvatarURL,
		Badges:      msg.Badges,
	}

	data, err := json.Marshal(wire)
	if err != nil {
		return nil, errors.Errorf("marshal chat wire message: %w", err)
	}

	return data, nil
}
