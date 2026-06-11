package config

import (
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDefaultUserConfigPath_WhenCalled_ExpectCommRelaySubdir(t *testing.T) {
	path, err := DefaultUserConfigPath()
	require.NoError(t, err)
	require.Equal(t, "config.json", filepath.Base(path))
	require.Contains(t, path, filepath.Join("comm-relay", "config.json"))
}
