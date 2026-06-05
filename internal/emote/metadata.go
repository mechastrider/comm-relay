package emote

import (
	"time"

	"github.com/mechastrider/comm-relay/internal/bus"
)

// ProviderID identifies a third-party emote metadata source.
type ProviderID string

const (
	// ProviderFFZ is FrankerFaceZ.
	ProviderFFZ ProviderID = "ffz"
	// ProviderBTTV is BetterTTV.
	ProviderBTTV ProviderID = "bttv"
	// Provider7TV is 7TV.
	Provider7TV ProviderID = "7tv"
)

// Metadata is normalized emote metadata stored in the cache.
// Image bytes are never stored; only CDN URLs and dimensions.
type Metadata struct {
	Provider    ProviderID
	Scope       Scope
	Code        string
	ID          string
	URL         string
	Width       int
	Height      int
	Animated    bool
	RefreshedAt time.Time
}

// ToFragment converts cached metadata into a wire-safe message fragment.
func (m Metadata) ToFragment() bus.MessageFragment {
	return bus.MessageFragment{
		Type:     bus.FragmentTypeEmote,
		Text:     m.Code,
		Provider: string(m.Provider),
		ID:       m.ID,
		URL:      m.URL,
		Width:    m.Width,
		Height:   m.Height,
		Animated: m.Animated,
	}
}
