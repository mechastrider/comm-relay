package config

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestLoad_WhenEmotesExplicitlyDisabled_ExpectPreserved(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	require.NoError(t, os.WriteFile(path, []byte(`{
  "server_port": 17877,
  "overlay": {
    "max_messages": 30,
    "message_ttl_seconds": 20,
    "emotes": { "twitch": false, "ffz": false, "bttv": false, "7tv": false }
  }
}`), 0o644))

	cfg, err := Load(path)
	require.NoError(t, err)
	require.False(t, cfg.Overlay.Emotes.Twitch)
	require.False(t, cfg.Overlay.Emotes.FFZ)
	require.False(t, cfg.Overlay.Emotes.BTTV)
	require.False(t, cfg.Overlay.Emotes.SevenTV)
}
