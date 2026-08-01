package config

import (
	"fmt"
	"net"
	"strconv"
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
	if c.Overlay.FontSizePx < OverlayFontSizeMin || c.Overlay.FontSizePx > OverlayFontSizeMax {
		fields["overlay_font_size_px"] = fmt.Sprintf(
			"Font size must be between %d and %d px.",
			OverlayFontSizeMin,
			OverlayFontSizeMax,
		)
	}
	switch c.Overlay.DisplayMode {
	case OverlayDisplayModeNormal, OverlayDisplayModeCompact:
	default:
		fields["overlay_display_mode"] = "Choose normal or compact layout."
	}
	switch c.Overlay.Theme {
	case OverlayThemeDefault, OverlayThemeDashboard, OverlayThemeCockpitPanel, OverlayThemeCockpitPopups, OverlayThemeGRebelsPopups:
	default:
		fields["overlay_theme"] = "Choose a supported overlay theme."
	}

	mergeFieldErrors(fields, c.Overlay.ImagePreviews.validateFields())
	mergeFieldErrors(fields, c.Admin.validateFields())

	if c.Twitch.Enabled && c.Twitch.Channel == "" {
		fields["twitch_channel"] = "Channel is required when Twitch is enabled."
	}
	if c.VK.Enabled && strings.TrimSpace(c.VK.Channel) == "" {
		fields["vk_channel"] = "Channel slug is required when VK Live is enabled."
	}
	switch c.YouTube.ConnectionMode {
	case YouTubeConnectionModeAPI, YouTubeConnectionModePage, "":
	default:
		fields["youtube_connection_mode"] = "Choose API (OAuth) or simple (video URL)."
	}
	switch c.YouTube.ChatMode {
	case YouTubeChatModeStream, YouTubeChatModePoll, YouTubeChatModeAuto, "":
	default:
		fields["youtube_chat_mode"] = "Choose stream, poll, or auto."
	}
	if c.YouTube.Enabled && c.YouTube.ConnectionMode == YouTubeConnectionModePage &&
		strings.TrimSpace(c.YouTube.VideoInput) == "" && strings.TrimSpace(c.YouTube.ChannelHandle) == "" {
		fields["youtube_channel_handle"] = "Set a channel handle or live video URL in simple mode."
	}
	if c.Logging.RetainSessions < 1 || c.Logging.RetainSessions > 100 {
		fields["logging_retain_sessions"] = "Keep between 1 and 100 session logs."
	}

	if c.ProxyRequired() {
		if msg := socks5AddressError(c.Network.SOCKS5.Address); msg != "" {
			fields["network_socks5_address"] = msg
		}
	}

	if len(fields) > 0 {
		return fields
	}
	return nil
}

func socks5AddressError(address string) string {
	address = strings.TrimSpace(address)
	if address == "" {
		return "SOCKS5 address is required when a platform uses the proxy."
	}

	host, portStr, err := net.SplitHostPort(address)
	if err != nil {
		return "Enter a valid host:port address (e.g. 127.0.0.1:1080)."
	}

	host = strings.TrimSpace(host)
	if host == "" {
		return "Enter a valid host:port address (e.g. 127.0.0.1:1080)."
	}

	port, err := strconv.Atoi(portStr)
	if err != nil || port < 1 || port > 65535 {
		return "Port must be between 1 and 65535."
	}

	return ""
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
