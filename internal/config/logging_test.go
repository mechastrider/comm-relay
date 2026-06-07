package config

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestLoggingConfig_ApplyDefaults_WhenPartialObject_ExpectEnabledAndRetainDefaults(t *testing.T) {
	t.Parallel()

	cfg := &LoggingConfig{
		RetainSessions: 0,
	}
	cfg.applyDefaults()

	require.True(t, cfg.IsEnabled())
	require.Equal(t, 5, cfg.RetainSessions)
}

func TestLoggingConfig_IsEnabled_WhenExplicitFalse_ExpectFalse(t *testing.T) {
	t.Parallel()

	disabled := false
	cfg := LoggingConfig{Enabled: &disabled}
	require.False(t, cfg.IsEnabled())
}

func TestDefault_WhenCalled_ExpectLoggingEnabledWithFiveSessions(t *testing.T) {
	t.Parallel()

	cfg := Default()
	require.True(t, cfg.Logging.IsEnabled())
	require.Equal(t, 5, cfg.Logging.RetainSessions)
}

func TestValidate_WhenLoggingRetainSessionsOutOfRange_ExpectInvalidConfig(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Logging.RetainSessions = 0

	err := cfg.Validate()
	require.Error(t, err)

	fields := ValidationFields(err)
	require.Contains(t, fields, "logging_retain_sessions")
}

func TestLogDir_WhenRelativeConfigPath_ExpectLogsBesideConfig(t *testing.T) {
	t.Parallel()

	dir, err := LogDir("config.json")
	require.NoError(t, err)
	require.Contains(t, dir, "logs")
}
