package config

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestValidate_WhenYouTubePageEnabledWithoutSource_ExpectFieldError(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.YouTube.Enabled = true
	cfg.YouTube.ConnectionMode = YouTubeConnectionModePage

	err := cfg.Validate()
	fields := ValidationFields(err)
	require.NotNil(t, fields)
	require.Equal(t, "Set a channel handle or live video URL in simple mode.", fields["youtube_channel_handle"])
}

func TestValidate_WhenYouTubeConnectionModeInvalid_ExpectFieldError(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.YouTube.ConnectionMode = "websocket"

	err := cfg.Validate()
	fields := ValidationFields(err)
	require.NotNil(t, fields)
	require.Equal(t, "Choose API (OAuth) or simple (video URL).", fields["youtube_connection_mode"])
}

func TestApplyYouTubeDefaults_WhenConnectionModeMissing_ExpectAPI(t *testing.T) {
	t.Parallel()

	cfg := YouTubeConfig{}
	cfg.ApplyYouTubeDefaults()
	require.Equal(t, YouTubeConnectionModeAPI, cfg.ConnectionMode)
}
