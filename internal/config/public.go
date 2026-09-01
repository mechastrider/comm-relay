package config

// PublicConfig is returned by the admin API without secrets or OAuth tokens.
type PublicConfig struct {
	ServerPort          int                 `json:"server_port"`
	PointsPerMessage    int                 `json:"points_per_message"`
	DayResetHour        int                 `json:"day_reset_hour"`
	HideCommandMessages bool                `json:"hide_command_messages"`
	Network             NetworkConfigPublic `json:"network"`
	Twitch              TwitchConfig        `json:"twitch"`
	YouTube             YouTubeConfigPublic `json:"youtube"`
	VK                  VKConfigPublic      `json:"vk"`
	Overlay             OverlayConfig       `json:"overlay"`
	Admin               AdminConfig         `json:"admin"`
	Logging             LoggingConfig       `json:"logging"`
}

// Public returns admin-safe settings (tokens and client secret omitted).
func (c Config) Public() PublicConfig {
	return PublicConfig{
		ServerPort:          c.ServerPort,
		PointsPerMessage:    c.PointsPerMessage,
		DayResetHour:        c.DayResetHour,
		HideCommandMessages: c.HideCommandMessages,
		Network:             c.Network.public(),
		Twitch:              c.Twitch,
		YouTube:             c.YouTube.public(),
		VK:                  c.VK.public(),
		Overlay:             c.Overlay,
		Admin:               c.Admin,
		Logging:             c.Logging,
	}
}
