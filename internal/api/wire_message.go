package api

import (
	"encoding/json"
	"time"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/bus"
)

const wireMessageType = "message"

// wireChatMessage is the JSON payload sent to overlay WebSocket clients.
type wireChatMessage struct {
	Type        string                `json:"type"`
	ID          string                `json:"id,omitempty"`
	Platform    string                `json:"platform"`
	User        string                `json:"user"`
	Message     string                `json:"message"`
	Fragments   []bus.MessageFragment `json:"fragments,omitempty"`
	DisplayName string                `json:"display_name,omitempty"`
	AvatarURL   string                `json:"avatar_url,omitempty"`
	Badges      []string              `json:"badges,omitempty"`
	Timestamp   string                `json:"timestamp,omitempty"`
}

func chatMessageWirePayload(msg bus.ChatMessage) ([]byte, error) {
	user := msg.Username
	if msg.DisplayName != "" {
		user = msg.DisplayName
	}

	wire := wireChatMessage{
		Type:        wireMessageType,
		ID:          msg.ID,
		Platform:    msg.Platform,
		User:        user,
		Message:     msg.Message,
		Fragments:   msg.Fragments,
		DisplayName: msg.DisplayName,
		AvatarURL:   msg.AvatarURL,
		Badges:      msg.Badges,
	}
	if !msg.Timestamp.IsZero() {
		wire.Timestamp = msg.Timestamp.UTC().Format(time.RFC3339)
	}

	data, err := json.Marshal(wire)
	if err != nil {
		return nil, errors.Errorf("marshal chat wire message: %w", err)
	}

	return data, nil
}
