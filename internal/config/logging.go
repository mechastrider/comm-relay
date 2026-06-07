package config

// LoggingConfig controls session log files written beside config.json.
type LoggingConfig struct {
	Enabled        *bool `json:"enabled,omitempty"`
	RetainSessions int   `json:"retain_sessions"`
}

func defaultLogging() LoggingConfig {
	enabled := true
	return LoggingConfig{
		Enabled:        &enabled,
		RetainSessions: 5,
	}
}

func (l *LoggingConfig) applyDefaults() {
	def := defaultLogging()
	if l.Enabled == nil {
		l.Enabled = def.Enabled
	}
	if l.RetainSessions < 1 {
		l.RetainSessions = def.RetainSessions
	}
}

// IsEnabled reports whether file logging is active.
func (l LoggingConfig) IsEnabled() bool {
	return l.Enabled != nil && *l.Enabled
}
