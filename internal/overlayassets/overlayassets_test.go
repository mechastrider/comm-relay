package overlayassets

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSafeFilename_WhenValid_ExpectOK(t *testing.T) {
	t.Parallel()

	name, ok := SafeFilename("gold-star.png")
	require.True(t, ok)
	require.Equal(t, "gold-star.png", name)
}

func TestSafeFilename_WhenTraversal_ExpectReject(t *testing.T) {
	t.Parallel()

	_, ok := SafeFilename("../secret.png")
	require.False(t, ok)
}

func TestSaveUploaded_WhenValid_ExpectStored(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	configPath := filepath.Join(dir, "config.json")
	body := []byte("fake-image")
	name, err := SaveUploaded(configPath, "icon.png", strings.NewReader(string(body)))
	require.NoError(t, err)
	require.Equal(t, "icon.png", name)

	assetsDir, err := Dir(configPath)
	require.NoError(t, err)
	data, err := os.ReadFile(filepath.Join(assetsDir, "icon.png"))
	require.NoError(t, err)
	require.Equal(t, body, data)
}
