package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/require"
)

func TestLoad_WhenMissingFile_ExpectDefaultsAndCreatesFile(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")

	cfg, err := Load(path)
	require.NoError(t, err)
	require.Equal(t, Default(), cfg)

	data, err := os.ReadFile(path)
	require.NoError(t, err)

	var onDisk Config
	require.NoError(t, json.Unmarshal(data, &onDisk))
	require.Equal(t, cfg.ServerPort, onDisk.ServerPort)
	require.Equal(t, cfg.Overlay.MaxMessages, onDisk.Overlay.MaxMessages)
}

func TestLoad_WhenValidFile_ExpectParsed(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	require.NoError(t, os.WriteFile(path, []byte(`{
  "server_port": 19000,
  "twitch": { "enabled": true, "channel": "streamer" },
  "youtube": { "enabled": false },
  "vk": { "enabled": false },
  "overlay": { "max_messages": 10, "message_ttl_seconds": 5 }
}
`), 0o644))

	cfg, err := Load(path)
	require.NoError(t, err)
	require.Equal(t, 19000, cfg.ServerPort)
	require.True(t, cfg.Twitch.Enabled)
	require.Equal(t, "streamer", cfg.Twitch.Channel)
	require.Equal(t, 10, cfg.Overlay.MaxMessages)
}

func TestLoad_WhenInvalidJSON_ExpectError(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	require.NoError(t, os.WriteFile(path, []byte(`{`), 0o644))

	_, err := Load(path)
	require.Error(t, err)
}

func TestValidate_WhenTwitchEnabledWithoutChannel_ExpectInvalidConfig(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Twitch.Enabled = true

	err := cfg.Validate()
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrInvalidConfig))
}

func TestSave_WhenRoundTrip_ExpectEqual(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")

	original := Default()
	original.ServerPort = 18080
	original.Twitch.Channel = "example"

	require.NoError(t, original.Save(path))

	loaded, err := Load(path)
	require.NoError(t, err)
	require.Equal(t, original.ServerPort, loaded.ServerPort)
	require.Equal(t, original.Twitch.Channel, loaded.Twitch.Channel)
}

func TestListenAddr_WhenDefaultPort_ExpectFormattedAddr(t *testing.T) {
	t.Parallel()

	cfg := Default()
	require.Equal(t, ":17877", cfg.ListenAddr())
}
