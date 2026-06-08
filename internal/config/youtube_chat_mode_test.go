package config

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestValidate_WhenYouTubeChatModeInvalid_ExpectFieldError(t *testing.T) {
	cfg := Default()
	cfg.YouTube.ChatMode = "websocket"
	require.Error(t, cfg.Validate())

	fields := ValidationFields(cfg.Validate())
	require.Equal(t, "Choose stream, poll, or auto.", fields["youtube_chat_mode"])
}

func TestValidate_WhenYouTubeChatModeValid_ExpectNoFieldError(t *testing.T) {
	for _, mode := range []string{YouTubeChatModeStream, YouTubeChatModePoll, YouTubeChatModeAuto} {
		cfg := Default()
		cfg.YouTube.ChatMode = mode
		require.NoError(t, cfg.Validate())
	}
}
