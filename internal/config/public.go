package config

// PublicConfig is returned by the admin API without secrets or OAuth tokens.
type PublicConfig struct {
	ServerPort int                 `json:"server_port"`
	Twitch     TwitchConfig        `json:"twitch"`
	YouTube    YouTubeConfigPublic `json:"youtube"`
	VK         PlatformFlags       `json:"vk"`
	Overlay    OverlayConfig       `json:"overlay"`
}

// Public returns admin-safe settings (tokens and client secret omitted).
func (c Config) Public() PublicConfig {
	return PublicConfig{
		ServerPort: c.ServerPort,
		Twitch:     c.Twitch,
		YouTube:    c.YouTube.public(),
		VK:         c.VK,
		Overlay:    c.Overlay,
	}
}
