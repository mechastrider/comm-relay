package api

import (
	"encoding/json"
	"time"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
)

const (
	wireMessageType         = "message"
	wireMessageDeletedType  = "message_deleted"
	wireOverlaySettingsType = "overlay_settings"
)

// wireChatMessage is the JSON payload sent to overlay WebSocket clients.
type wireChatMessage struct {
	Type        string                `json:"type"`
	ID          string                `json:"id,omitempty"`
	Platform    string                `json:"platform"`
	User        string                `json:"user"`
	Username    string                `json:"username,omitempty"`
	Message     string                `json:"message"`
	Fragments   []bus.MessageFragment `json:"fragments,omitempty"`
	DisplayName string                `json:"display_name,omitempty"`
	AvatarURL   string                `json:"avatar_url,omitempty"`
	Badges      []string              `json:"badges,omitempty"`
	Timestamp   string                `json:"timestamp,omitempty"`
}

type wireOverlaySettings struct {
	Type    string               `json:"type"`
	Overlay config.OverlayConfig `json:"overlay"`
}

type wireMessageDeleted struct {
	Type     string `json:"type"`
	Platform string `json:"platform"`
	ID       string `json:"id"`
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
		Username:    msg.Username,
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

func overlaySettingsWirePayload(overlay config.OverlayConfig) ([]byte, error) {
	data, err := json.Marshal(wireOverlaySettings{
		Type:    wireOverlaySettingsType,
		Overlay: overlay,
	})
	if err != nil {
		return nil, errors.Errorf("marshal overlay settings wire event: %w", err)
	}
	return data, nil
}

func messageDeletedWirePayload(platform, id string) ([]byte, error) {
	data, err := json.Marshal(wireMessageDeleted{
		Type:     wireMessageDeletedType,
		Platform: platform,
		ID:       id,
	})
	if err != nil {
		return nil, errors.Errorf("marshal message deleted wire event: %w", err)
	}

	return data, nil
}
