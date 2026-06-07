package config

import (
	"strings"

	"github.com/muonsoft/errors"
)

// DefaultImagePreviewHosts are used when image previews are enabled and allowed_hosts is empty.
var DefaultImagePreviewHosts = []string{
	"i.imgur.com",
	"cdn.discordapp.com",
	"media.discordapp.net",
	"media.giphy.com",
	"static-cdn.jtvnw.net",
	"pbs.twimg.com",
}

// ImagePreviewsConfig controls safe direct image link previews in the overlay.
type ImagePreviewsConfig struct {
	Enabled       bool     `json:"enabled"`
	AllowedHosts  []string `json:"allowed_hosts,omitempty"`
	MaxWidthPx    int      `json:"max_width_px"`
	MaxHeightPx   int      `json:"max_height_px"`
	MaxPerMessage int      `json:"max_per_message"`
}

func defaultImagePreviews() ImagePreviewsConfig {
	return ImagePreviewsConfig{
		Enabled:       false,
		AllowedHosts:  append([]string(nil), DefaultImagePreviewHosts...),
		MaxWidthPx:    320,
		MaxHeightPx:   180,
		MaxPerMessage: 1,
	}
}

func (c *ImagePreviewsConfig) applyDefaults() {
	def := defaultImagePreviews()
	if c.MaxWidthPx < 1 {
		c.MaxWidthPx = def.MaxWidthPx
	}
	if c.MaxHeightPx < 1 {
		c.MaxHeightPx = def.MaxHeightPx
	}
	if c.MaxPerMessage < 1 {
		c.MaxPerMessage = def.MaxPerMessage
	}
	if len(c.AllowedHosts) == 0 {
		c.AllowedHosts = append([]string(nil), def.AllowedHosts...)
	}
}

func (c ImagePreviewsConfig) validateFields() FieldErrors {
	fields := FieldErrors{}
	if !c.Enabled {
		return fields
	}
	if c.MaxWidthPx < 32 || c.MaxWidthPx > 1920 {
		fields["overlay_image_previews_max_width_px"] = "Max width must be between 32 and 1920 px."
	}
	if c.MaxHeightPx < 32 || c.MaxHeightPx > 1080 {
		fields["overlay_image_previews_max_height_px"] = "Max height must be between 32 and 1080 px."
	}
	if c.MaxPerMessage < 1 || c.MaxPerMessage > 5 {
		fields["overlay_image_previews_max_per_message"] = "Max previews per message must be between 1 and 5."
	}
	for _, host := range c.AllowedHosts {
		if err := validateAllowedHost(host); err != nil {
			fields["overlay_image_previews_allowed_hosts"] = allowedHostErrorMessage(host)
			break
		}
	}
	return fields
}

func allowedHostErrorMessage(host string) string {
	host = normalizeAllowedHost(host)
	if host == "" {
		return "Add at least one allowed hostname."
	}
	return "Each host must be a hostname without path or port."
}

func validateAllowedHost(host string) error {
	host = normalizeAllowedHost(host)
	if host == "" {
		return errors.Errorf("%w: overlay.image_previews.allowed_hosts must not be empty", ErrInvalidConfig)
	}
	if strings.Contains(host, "/") || strings.Contains(host, ":") {
		return errors.Errorf(
			"%w: overlay.image_previews.allowed_hosts entry %q must be a hostname without path or port",
			ErrInvalidConfig,
			host,
		)
	}
	return nil
}

func normalizeAllowedHost(host string) string {
	host = strings.TrimSpace(strings.ToLower(host))
	host = strings.TrimPrefix(host, ".")
	return host
}

// NormalizedAllowedHosts returns lowercase hostnames for policy checks.
func (c ImagePreviewsConfig) NormalizedAllowedHosts() []string {
	hosts := c.AllowedHosts
	if len(hosts) == 0 {
		hosts = DefaultImagePreviewHosts
	}
	out := make([]string, 0, len(hosts))
	for _, host := range hosts {
		if normalized := normalizeAllowedHost(host); normalized != "" {
			out = append(out, normalized)
		}
	}
	return out
}
