package config

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/require"
)

func TestValidate_WhenMessageSoundVolumeOutOfRange_ExpectInvalidConfig(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Admin.MessageSound.Volume = 1.5

	err := cfg.Validate()
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrInvalidConfig))
}

func TestValidate_WhenMessageSoundUnknownType_ExpectInvalidConfig(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Admin.MessageSound.Sound = "bell"

	err := cfg.Validate()
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrInvalidConfig))
}

func TestLoad_WhenAdminMissing_ExpectMessageSoundDefaults(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	require.NoError(t, os.WriteFile(path, []byte(`{
  "server_port": 17877,
  "twitch": { "enabled": false, "channel": "" },
  "youtube": { "enabled": false },
  "vk": { "enabled": false },
  "overlay": { "max_messages": 30, "message_ttl_seconds": 20 }
}
`), 0o644))

	cfg, err := Load(path)
	require.NoError(t, err)
	require.False(t, cfg.Admin.MessageSound.Enabled)
	require.Equal(t, 0.5, cfg.Admin.MessageSound.Volume)
	require.Equal(t, MessageSoundChime, cfg.Admin.MessageSound.Sound)
}
