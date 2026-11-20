package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestAISettings_LegacyUpgradeAndDisabledRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	require.NoError(t, os.WriteFile(path, []byte(`{"twitch":{"enabled":false}}`), 0600))
	c, err := Load(path)
	require.NoError(t, err)
	require.False(t, c.Features.ExperimentalAIMessages)
	require.Equal(t, 300, c.AIMessages.Limits.InputMaxChars)
	c.AIMessages.StreamContext = "Custom context"
	c.AIMessages.Limits.ViewerCooldownSeconds = 0
	require.NoError(t, c.Save(path))
	restored, err := Load(path)
	require.NoError(t, err)
	require.Equal(t, c.AIMessages, restored.AIMessages)
	data, err := json.Marshal(restored.Public())
	require.NoError(t, err)
	require.Contains(t, string(data), `"experimental_ai_messages":false`)
}
func TestAISettings_RejectsUnsafeEndpointsAndInvalidLimits(t *testing.T) {
	for _, endpoint := range []string{"http://api.example.com/v1", "https://user:secret@example.com", "https://example.com?key=secret", "http://localhost.evil/v1"} {
		require.False(t, ValidAIEndpoint(endpoint))
	}
	for _, endpoint := range []string{"https://api.openai.com/v1", "http://127.0.0.1:1234/v1", "http://[::1]:1234/v1"} {
		require.True(t, ValidAIEndpoint(endpoint))
	}
	c := Default()
	c.AIMessages.Limits.QueueCapacity = 100
	require.Error(t, c.Validate())
}
