package config

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestLoad_WhenBuffCapsOmitted_ExpectDefaults(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	require.NoError(t, os.WriteFile(path, []byte(`{
  "server_port": 17877,
  "activity_interval_seconds": 300,
  "activity_session_limit": 10,
  "activity_xp": 1,
  "day_reset_hour": 6,
  "twitch": { "enabled": false },
  "youtube": { "enabled": false },
  "vk": { "enabled": false },
  "overlay": { "max_messages": 30, "message_ttl_seconds": 20 }
}`), 0o644))

	cfg, err := Load(path)
	require.NoError(t, err)
	require.Equal(t, BuffsPerAwardPerViewerDefault, cfg.BuffsPerAwardPerViewer)
	require.Equal(t, BuffMaxUniqueViewersDefault, cfg.BuffMaxUniqueViewers)
}

func TestValidate_WhenBuffCapsNegative_ExpectFieldErrors(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.BuffsPerAwardPerViewer = -1
	cfg.BuffMaxUniqueViewers = -2
	err := cfg.Validate()
	fields := ValidationFields(err)
	require.Equal(t, "Buffs per award per viewer must be 0 or greater.", fields["buffs_per_award_per_viewer"])
	require.Equal(t, "Buff max unique viewers must be 0 or greater.", fields["buff_max_unique_viewers"])
}
