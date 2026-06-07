package config

// EmotesConfig controls which emote providers are rendered in chat messages.
type EmotesConfig struct {
	Twitch  bool `json:"twitch"`
	FFZ     bool `json:"ffz"`
	BTTV    bool `json:"bttv"`
	SevenTV bool `json:"7tv"`
}

func defaultEmotes() EmotesConfig {
	return EmotesConfig{
		Twitch:  true,
		FFZ:     true,
		BTTV:    true,
		SevenTV: true,
	}
}

func (c *EmotesConfig) applyDefaults() {
	// Boolean fields are explicit; legacy migration happens in Load when overlay.emotes is absent.
}

// ThirdPartyEnabled reports whether any third-party emote provider is enabled.
func (c EmotesConfig) ThirdPartyEnabled() bool {
	return c.FFZ || c.BTTV || c.SevenTV
}
