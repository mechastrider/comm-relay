package api

import (
	"io"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestStaticRootsFromDisk_WhenBuildMissing_ExpectActionableError(t *testing.T) {
	t.Parallel()
	_, err := staticRootsFromDisk(t.TempDir())
	require.ErrorContains(t, err, "npm ci && npm run build")
}

func TestStaticRootsFromDisk_WhenBuilt_ExpectCompiledAdminOnly(t *testing.T) {
	t.Parallel()
	root := t.TempDir()
	for _, dir := range []string{"admin/dist", "dock", "overlay", "leaderboard", "alert", "recap", "shared"} {
		require.NoError(t, os.MkdirAll(filepath.Join(root, dir), 0o750))
		name := "index.html"
		if dir == "shared" {
			name = "chat-render.js"
		}
		require.NoError(t, os.WriteFile(filepath.Join(root, dir, name), []byte("compiled fixture"), 0o600))
	}
	require.NoError(t, os.WriteFile(filepath.Join(root, "admin", "index.html"), []byte("source must not be served"), 0o600))
	roots, err := staticRootsFromDisk(root)
	require.NoError(t, err)
	content, err := roots.admin.Open("index.html")
	require.NoError(t, err)
	data, err := io.ReadAll(content)
	require.NoError(t, err)
	require.Equal(t, "compiled fixture", string(data))
	require.NoError(t, content.Close())
	_, err = roots.admin.Open("../index.html")
	require.Error(t, err)
}
