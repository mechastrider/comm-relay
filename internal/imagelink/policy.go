package imagelink

import "github.com/mechastrider/comm-relay/internal/config"

// Policy holds runtime rules for safe image link previews.
type Policy struct {
	Enabled       bool
	AllowedHosts  []string
	MaxWidthPx    int
	MaxHeightPx   int
	MaxPerMessage int
}

// PolicyFromConfig builds a policy from overlay image preview settings.
func PolicyFromConfig(cfg config.ImagePreviewsConfig) Policy {
	return Policy{
		Enabled:       cfg.Enabled,
		AllowedHosts:  cfg.NormalizedAllowedHosts(),
		MaxWidthPx:    cfg.MaxWidthPx,
		MaxHeightPx:   cfg.MaxHeightPx,
		MaxPerMessage: cfg.MaxPerMessage,
	}
}
