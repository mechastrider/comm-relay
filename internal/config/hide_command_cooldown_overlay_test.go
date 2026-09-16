package config_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/config"
)

func TestLoad_WhenHideCommandCooldownOverlayOmitted_ExpectFalse(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	require.NoError(t, os.WriteFile(path, []byte(`{"server_port":17877}`), 0o644))

	cfg, err := config.Load(path)
	require.NoError(t, err)
	require.False(t, cfg.HideCommandCooldownOverlay)
	require.False(t, cfg.Public().HideCommandCooldownOverlay)
}
