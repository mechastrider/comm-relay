package config_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/config"
)

func TestLoad_WhenActivityFieldsOmitted_ExpectDefaults(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	require.NoError(t, os.WriteFile(path, []byte(`{
  "server_port": 19000,
  "twitch": { "enabled": false },
  "overlay": { "max_messages": 10, "message_ttl_seconds": 5 }
}`), 0o644))

	cfg, err := config.Load(path)
	require.NoError(t, err)
	require.Equal(t, 300, cfg.ActivityIntervalSeconds)
	require.Equal(t, 10, cfg.ActivitySessionLimit)
	require.Equal(t, 1, cfg.ActivityXP)
}

func TestLoad_WhenLegacyPointsPerMessageOnly_ExpectActivityDefaultsAndNoProgressField(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	require.NoError(t, os.WriteFile(path, []byte(`{
  "server_port": 19000,
  "points_per_message": 5,
  "twitch": { "enabled": false },
  "overlay": { "max_messages": 10, "message_ttl_seconds": 5 }
}`), 0o644))

	cfg, err := config.Load(path)
	require.NoError(t, err)
	require.Equal(t, 300, cfg.ActivityIntervalSeconds)
	require.Equal(t, 10, cfg.ActivitySessionLimit)
	require.Equal(t, 1, cfg.ActivityXP)
	require.Equal(t, 0, cfg.PointsPerMessage)

	require.NoError(t, cfg.Save(path))
	saved, err := os.ReadFile(path)
	require.NoError(t, err)
	require.NotContains(t, string(saved), "points_per_message")
}

func TestPublic_WhenCalled_ExpectActivityFieldsAndNoPointsPerMessage(t *testing.T) {
	t.Parallel()

	cfg := config.Default()
	public := cfg.Public()
	require.Equal(t, 300, public.ActivityIntervalSeconds)

	data, err := json.Marshal(public)
	require.NoError(t, err)
	require.NotContains(t, string(data), "points_per_message")
	require.Contains(t, string(data), "activity_interval_seconds")
}
