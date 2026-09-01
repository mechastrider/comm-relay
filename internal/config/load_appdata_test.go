package config

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestLoad_AppDataConfig_WhenPresent_ExpectAllPresets(t *testing.T) {
	appData := os.Getenv("APPDATA")
	if appData == "" {
		t.Skip("APPDATA not set")
	}

	path := filepath.Join(appData, "comm-relay", "config.json")
	if _, err := os.Stat(path); err != nil {
		t.Skip("user config not found")
	}

	data, err := os.ReadFile(path)
	require.NoError(t, err)
	require.True(t, overlayPresetsPresent(data), "expected presets key in user config")

	cfg, err := Load(path)
	require.NoError(t, err)
	require.GreaterOrEqual(t, len(cfg.Overlay.Presets), 2)
}
