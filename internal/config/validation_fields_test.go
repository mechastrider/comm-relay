package config

import (
	"os"
	"testing"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/require"
)

func TestValidateFields_WhenImagePreviewHostInvalid_ExpectFieldError(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Overlay.ImagePreviews.Enabled = true
	cfg.Overlay.ImagePreviews.AllowedHosts = []string{"bad/host"}

	err := cfg.Validate()
	require.Error(t, err)

	fields := ValidationFields(err)
	require.Contains(t, fields, "overlay_image_previews_allowed_hosts")
	require.True(t, errors.Is(err, ErrInvalidConfig))
}

func TestLoad_WhenLegacyOverlayWithoutEmotes_ExpectDefaultsEnabled(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := dir + "/config.json"
	require.NoError(t, os.WriteFile(path, []byte(`{
  "server_port": 17877,
  "overlay": { "max_messages": 30, "message_ttl_seconds": 20 }
}`), 0o644))

	loaded, err := Load(path)
	require.NoError(t, err)
	require.Equal(t, defaultEmotes(), loaded.Overlay.Emotes)
}
