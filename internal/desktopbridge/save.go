package desktopbridge

import (
	"context"
	"encoding/base64"
	"os"
	"path/filepath"
	"strings"

	"github.com/muonsoft/errors"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const maxPNGBytes = 20 * 1024 * 1024

var pngMagic = []byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}

// WritePNGWithSaveDialog shows a native save dialog and writes decoded PNG bytes.
// An empty returned path means the user cancelled without error.
func WritePNGWithSaveDialog(ctx context.Context, dialogTitle, defaultFilename, pngBase64 string) (string, error) {
	if ctx == nil {
		return "", errors.New("desktop context missing")
	}

	data, err := base64.StdEncoding.DecodeString(strings.TrimSpace(pngBase64))
	if err != nil {
		return "", errors.Errorf("decode png: %w", err)
	}
	if len(data) == 0 || len(data) > maxPNGBytes {
		return "", errors.Errorf("png payload size out of range")
	}
	if len(data) < len(pngMagic) || !bytesHasPrefix(data, pngMagic) {
		return "", errors.Errorf("png payload is not a png image")
	}

	filename := sanitizeFilename(defaultFilename)
	if filename == "" {
		filename = "comm-relay-recap.png"
	}

	title := strings.TrimSpace(dialogTitle)
	if title == "" {
		title = "Save image"
	}

	path, err := runtime.SaveFileDialog(ctx, runtime.SaveDialogOptions{
		Title:           title,
		DefaultFilename: filename,
		Filters: []runtime.FileFilter{
			{DisplayName: "PNG image (*.png)", Pattern: "*.png"},
		},
	})
	if err != nil {
		return "", errors.Errorf("save file dialog: %w", err)
	}
	if path == "" {
		return "", nil
	}

	if err := os.WriteFile(path, data, 0o644); err != nil {
		return "", errors.Errorf("write png file: %w", err)
	}

	return path, nil
}

func sanitizeFilename(name string) string {
	name = strings.TrimSpace(name)
	name = filepath.Base(name)
	name = strings.ReplaceAll(name, "\x00", "")
	return name
}

func bytesHasPrefix(data, prefix []byte) bool {
	if len(data) < len(prefix) {
		return false
	}
	for i := range prefix {
		if data[i] != prefix[i] {
			return false
		}
	}
	return true
}
