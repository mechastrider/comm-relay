package config_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/config"
)

func TestLoad_WhenCustomAvatarsEnabledOmitted_ExpectTrue(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	require.NoError(t, os.WriteFile(path, []byte(`{"server_port":17877}`), 0o644))

	cfg, err := config.Load(path)
	require.NoError(t, err)
	require.True(t, cfg.CustomAvatarsEnabled)
	require.True(t, cfg.Public().CustomAvatarsEnabled)
}

func TestValidateIncomingJSONFields_WhenCustomAvatarsEnabledInvalid_ExpectFieldError(t *testing.T) {
	t.Parallel()

	fields := config.ValidateIncomingJSONFields([]byte(`{"custom_avatars_enabled":"yes"}`))
	require.Contains(t, fields, "custom_avatars_enabled")
}
