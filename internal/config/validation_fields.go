package config

import (
	"strings"

	"github.com/muonsoft/errors"
)

// FieldErrors maps admin form field keys to user-facing validation messages.
type FieldErrors map[string]string

// ValidationFields extracts structured field errors from a config validation error.
func ValidationFields(err error) FieldErrors {
	if err == nil {
		return nil
	}

	fields, ok := errors.As[FieldErrors](err)
	if ok {
		return fields
	}
	return nil
}

func (c *Config) validateFields() error {
	fields := FieldErrors{}

	if c.ServerPort < 1 || c.ServerPort > 65535 {
		fields["server_port"] = "Port must be between 1 and 65535."
	}
	if c.Overlay.MaxMessages < 1 {
		fields["overlay_max_messages"] = "Enter at least 1 message."
	}
	if c.Overlay.MessageTTLSeconds < 0 {
		fields["overlay_message_ttl_seconds"] = "TTL must be 0 or greater."
	}
	if c.Overlay.FontSizePx < 12 || c.Overlay.FontSizePx > 32 {
		fields["overlay_font_size_px"] = "Font size must be between 12 and 32 px."
	}
	switch c.Overlay.DisplayMode {
	case OverlayDisplayModeNormal, OverlayDisplayModeCompact:
	default:
		fields["overlay_display_mode"] = "Choose normal or compact layout."
	}
	switch c.Overlay.Theme {
	case OverlayThemeDefault, OverlayThemeDashboard:
	default:
		fields["overlay_theme"] = "Choose default or dashboard theme."
	}

	mergeFieldErrors(fields, c.Overlay.ImagePreviews.validateFields())
	mergeFieldErrors(fields, c.Admin.MessageSound.validateFields())

	if c.Twitch.Enabled && c.Twitch.Channel == "" {
		fields["twitch_channel"] = "Channel is required when Twitch is enabled."
	}
	if c.VK.Enabled && strings.TrimSpace(c.VK.Channel) == "" {
		fields["vk_channel"] = "Channel slug is required when VK Live is enabled."
	}
	switch c.YouTube.ChatMode {
	case YouTubeChatModeStream, YouTubeChatModePoll, YouTubeChatModeAuto, "":
	default:
		fields["youtube_chat_mode"] = "Choose stream, poll, or auto."
	}
	if c.Logging.RetainSessions < 1 || c.Logging.RetainSessions > 100 {
		fields["logging_retain_sessions"] = "Keep between 1 and 100 session logs."
	}

	if len(fields) > 0 {
		return fields
	}
	return nil
}

func mergeFieldErrors(dst FieldErrors, src FieldErrors) {
	for key, msg := range src {
		dst[key] = msg
	}
}

// Error implements error for FieldErrors.
func (f FieldErrors) Error() string {
	if len(f) == 0 {
		return ErrInvalidConfig.Error()
	}
	return ErrInvalidConfig.Error() + ": check highlighted fields"
}

// Is supports errors.Is(err, ErrInvalidConfig).
func (f FieldErrors) Is(target error) bool {
	return target == ErrInvalidConfig
}
