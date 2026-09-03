package api

import (
	"encoding/json"
	"time"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/store"
)

const (
	wireMessageType         = "message"
	wireMessageDeletedType  = "message_deleted"
	wireOverlaySettingsType = "overlay_settings"
	wireAlertType           = "alert"
)

// wireChatMessage is the JSON payload sent to overlay WebSocket clients.
type wireChatMessage struct {
	Type        string                `json:"type"`
	ID          string                `json:"id,omitempty"`
	Platform    string                `json:"platform"`
	UserID      string                `json:"user_id,omitempty"`
	User        string                `json:"user"`
	Username    string                `json:"username,omitempty"`
	Message     string                `json:"message"`
	Fragments   []bus.MessageFragment `json:"fragments,omitempty"`
	DisplayName string                `json:"display_name,omitempty"`
	AvatarURL   string                `json:"avatar_url,omitempty"`
	Badges      []string              `json:"badges,omitempty"`
	Timestamp   string                `json:"timestamp,omitempty"`
	IsCommand   bool                  `json:"is_command,omitempty"`
}

type wireOverlaySettings struct {
	Type                string               `json:"type"`
	Overlay             config.OverlayConfig `json:"overlay"`
	HideCommandMessages bool                 `json:"hide_command_messages"`
}

type wireMessageDeleted struct {
	Type     string `json:"type"`
	Platform string `json:"platform"`
	ID       string `json:"id"`
}

type wireAlert struct {
	Type            string `json:"type"`
	Name            string `json:"name"`
	AvatarURL       string `json:"avatar_url,omitempty"`
	Text            string `json:"text"`
	Points          int    `json:"points"`
	Sound           string `json:"sound"`
	DurationMs      int    `json:"duration_ms"`
	Source          string `json:"source"`
	CreatedAt       string `json:"created_at"`
	Trigger         string `json:"trigger,omitempty"`
	AwardID         string `json:"award_id,omitempty"`
	AwardName       string `json:"award_name,omitempty"`
	MessagePlatform string `json:"message_platform,omitempty"`
	MessageID       string `json:"message_id,omitempty"`
	MessageText     string `json:"message_text,omitempty"`
}

func chatMessageWirePayload(msg bus.ChatMessage, isCommand bool) ([]byte, error) {
	user := msg.Username
	if msg.DisplayName != "" {
		user = msg.DisplayName
	}

	wire := wireChatMessage{
		Type:        wireMessageType,
		ID:          msg.ID,
		Platform:    msg.Platform,
		UserID:      msg.UserID,
		User:        user,
		Username:    msg.Username,
		Message:     msg.Message,
		Fragments:   msg.Fragments,
		DisplayName: msg.DisplayName,
		AvatarURL:   msg.AvatarURL,
		Badges:      msg.Badges,
		IsCommand:   isCommand,
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

func overlaySettingsWirePayload(cfg config.Config) ([]byte, error) {
	data, err := json.Marshal(wireOverlaySettings{
		Type:                wireOverlaySettingsType,
		Overlay:             cfg.Overlay,
		HideCommandMessages: cfg.HideCommandMessages,
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

func alertWirePayload(cmd *store.Command, msg bus.ChatMessage, text string, points int) ([]byte, error) {
	name := msg.Username
	if msg.DisplayName != "" {
		name = msg.DisplayName
	}

	data, err := json.Marshal(wireAlert{
		Type:       wireAlertType,
		Name:       name,
		AvatarURL:  msg.AvatarURL,
		Text:       text,
		Points:     points,
		Sound:      cmd.Sound,
		DurationMs: cmd.DurationMs,
		Source:     "command",
		CreatedAt:  time.Now().UTC().Format(time.RFC3339Nano),
		Trigger:    cmd.Trigger,
	})
	if err != nil {
		return nil, errors.Errorf("marshal alert wire event: %w", err)
	}

	return data, nil
}

type awardAlertContext struct {
	MessagePlatform string
	MessageID       string
	MessageText     string
}

func awardAlertWirePayload(
	award *store.AwardType,
	name, avatarURL, text string,
	points int,
	createdAt time.Time,
	context awardAlertContext,
) ([]byte, error) {
	data, err := json.Marshal(wireAlert{
		Type:            wireAlertType,
		Name:            name,
		AvatarURL:       avatarURL,
		Text:            text,
		Points:          points,
		Sound:           award.Sound,
		DurationMs:      award.DurationMs,
		Source:          "award",
		CreatedAt:       createdAt.UTC().Format(time.RFC3339Nano),
		AwardID:         award.ID,
		AwardName:       award.Name,
		MessagePlatform: context.MessagePlatform,
		MessageID:       context.MessageID,
		MessageText:     context.MessageText,
	})
	if err != nil {
		return nil, errors.Errorf("marshal award alert wire event: %w", err)
	}

	return data, nil
}
