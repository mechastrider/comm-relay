package overlayassets

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSave_WhenPNG_ExpectStoredFilename(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	png := []byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01}

	name, err := Save(dir, png)
	require.NoError(t, err)
	require.True(t, strings.HasSuffix(name, ".png"))
	_, err = os.Stat(filepath.Join(dir, name))
	require.NoError(t, err)
}

func TestSave_WhenTooLarge_ExpectError(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	data := bytes.Repeat([]byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}, MaxBytes)

	_, err := Save(dir, data)
	require.Error(t, err)
}

func TestSave_WhenUnsafeSVG_ExpectError(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	svg := []byte(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`)

	_, err := Save(dir, svg)
	require.Error(t, err)
}

func TestDirForConfig_WhenPath_ExpectSiblingDirectory(t *testing.T) {
	t.Parallel()

	require.Equal(t, filepath.Join("/tmp", "overlay-assets"), DirForConfig("/tmp/config.json"))
}
