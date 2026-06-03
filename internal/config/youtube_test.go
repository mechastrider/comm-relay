package config

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestMergeYouTubeOAuthFrom_WhenSecretEmpty_ExpectPreviousSecretKept(t *testing.T) {
	t.Parallel()

	prev := Default()
	prev.YouTube.OAuth.ClientSecret = "secret"
	prev.YouTube.OAuth.RefreshToken = "refresh"

	incoming := Default()
	incoming.MergeYouTubeOAuthFrom(*prev)

	require.Equal(t, "secret", incoming.YouTube.OAuth.ClientSecret)
	require.Equal(t, "refresh", incoming.YouTube.OAuth.RefreshToken)
}

func TestPublic_WhenTokensPresent_ExpectRedacted(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.YouTube.OAuth.ClientSecret = "secret"
	cfg.YouTube.OAuth.AccessToken = "access"
	cfg.YouTube.OAuth.RefreshToken = "refresh"

	pub := cfg.Public()
	require.True(t, pub.YouTube.OAuth.HasClientSecret)
	require.True(t, pub.YouTube.OAuth.Connected)
}
