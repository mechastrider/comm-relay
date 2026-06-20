package config

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestValidate_WhenYouTubePageEnabledWithoutVideoInput_ExpectFieldError(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.YouTube.Enabled = true
	cfg.YouTube.ConnectionMode = YouTubeConnectionModePage

	err := cfg.Validate()
	fields := ValidationFields(err)
	require.NotNil(t, fields)
	require.Equal(t, "Live video URL or ID is required in simple mode.", fields["youtube_video_input"])
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
