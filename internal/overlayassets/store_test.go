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

func TestSave_WhenDOCTYPESVG_ExpectStoredFilename(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	svg := []byte(`<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>`)

	name, err := Save(dir, svg)
	require.NoError(t, err)
	require.True(t, strings.HasSuffix(name, ".svg"))
}

func TestSave_WhenHEIC_ExpectModernFormatError(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	heic := []byte{
		0x00, 0x00, 0x00, 0x18, 'f', 't', 'y', 'p', 'h', 'e', 'i', 'c',
	}

	_, err := Save(dir, heic)
	require.ErrorIs(t, err, ErrModernImageFormat)
}

func TestDirForConfig_WhenPath_ExpectSiblingDirectory(t *testing.T) {
	t.Parallel()

	require.Equal(t, filepath.Join("/tmp", "overlay-assets"), DirForConfig("/tmp/config.json"))
}
