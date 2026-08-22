package overlayassets

import (
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/muonsoft/errors"
)

const (
	maxUploadBytes = 512 * 1024
	assetsDirName  = "overlay-assets"
)

// MaxUploadBytes is the maximum overlay asset upload size.
const MaxUploadBytes = maxUploadBytes

var (
	// ErrInvalidFilename is returned when an asset filename is unsafe.
	ErrInvalidFilename = errors.New("invalid overlay asset filename")
	// ErrUploadTooLarge is returned when an upload exceeds MaxUploadBytes.
	ErrUploadTooLarge = errors.New("overlay asset exceeds size limit")
	// ErrAssetNotFound is returned when a requested asset file is missing.
	ErrAssetNotFound = errors.New("overlay asset not found")
)

// Dir returns the overlay assets directory adjacent to config.json.
func Dir(configPath string) (string, error) {
	abs, err := filepath.Abs(configPath)
	if err != nil {
		return "", errors.Errorf("resolve config path: %w", err)
	}
	dir := filepath.Join(filepath.Dir(abs), assetsDirName)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", errors.Errorf("create overlay assets directory: %w", err)
	}
	return dir, nil
}

// SafeFilename rejects path traversal and validates extension.
func SafeFilename(name string) (string, bool) {
	name = strings.TrimSpace(name)
	name = strings.ReplaceAll(name, "\\", "/")
	if name == "" || strings.Contains(name, "/") || strings.Contains(name, "..") {
		return "", false
	}
	lower := strings.ToLower(name)
	switch {
	case strings.HasSuffix(lower, ".png"),
		strings.HasSuffix(lower, ".jpg"),
		strings.HasSuffix(lower, ".jpeg"),
		strings.HasSuffix(lower, ".webp"),
		strings.HasSuffix(lower, ".gif"),
		strings.HasSuffix(lower, ".svg"):
		return name, true
	default:
		return "", false
	}
}

// ResolvePath returns the absolute path for a safe filename inside the assets dir.
func ResolvePath(configPath, filename string) (string, error) {
	safe, ok := SafeFilename(filename)
	if !ok {
		return "", ErrInvalidFilename
	}
	dir, err := Dir(configPath)
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, safe), nil
}

// SaveUploaded writes an uploaded file to the assets directory with a safe filename.
func SaveUploaded(configPath string, filename string, reader io.Reader) (string, error) {
	safe, ok := SafeFilename(filename)
	if !ok {
		return "", ErrInvalidFilename
	}
	target, err := ResolvePath(configPath, safe)
	if err != nil {
		return "", err
	}

	tmp, err := os.CreateTemp(filepath.Dir(target), safe+".upload.*")
	if err != nil {
		return "", errors.Errorf("create temp upload: %w", err)
	}
	tmpPath := tmp.Name()
	cleanup := func() {
		_ = tmp.Close()
		_ = os.Remove(tmpPath)
	}

	limited := io.LimitReader(reader, maxUploadBytes+1)
	n, err := io.Copy(tmp, limited)
	if err != nil {
		cleanup()
		return "", errors.Errorf("write overlay asset: %w", err)
	}
	if n > maxUploadBytes {
		cleanup()
		return "", ErrUploadTooLarge
	}
	if err := tmp.Close(); err != nil {
		cleanup()
		return "", errors.Errorf("close temp upload: %w", err)
	}
	if err := os.Rename(tmpPath, target); err != nil {
		_ = os.Remove(tmpPath)
		return "", errors.Errorf("store overlay asset: %w", err)
	}

	return safe, nil
}

// Serve writes a safe asset file to the response.
func Serve(configPath, filename string, w http.ResponseWriter, r *http.Request) error {
	path, err := ResolvePath(configPath, filename)
	if err != nil {
		return err
	}
	if _, err := os.Stat(path); err != nil {
		if os.IsNotExist(err) {
			return ErrAssetNotFound
		}
		return errors.Errorf("stat overlay asset: %w", err)
	}
	http.ServeFile(w, r, path)
	return nil
}
