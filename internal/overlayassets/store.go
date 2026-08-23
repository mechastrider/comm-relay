package overlayassets

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"unicode/utf8"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
)

const (
	// MaxBytes is the maximum accepted overlay asset size.
	MaxBytes = 512 << 10
)

var (
	// ErrUnsupportedType is returned when the bytes are not a supported image.
	ErrUnsupportedType = errors.New("unsupported overlay asset type")
	// ErrUnsafeSVG is returned when an SVG contains executable content.
	ErrUnsafeSVG  = errors.New("svg asset contains unsafe content")
	errEmptyAsset = errors.New("overlay asset is empty")
)

// DirForConfig returns the overlay-assets directory next to config.json.
func DirForConfig(configPath string) string {
	return filepath.Join(filepath.Dir(configPath), "overlay-assets")
}

// Save writes a sniffed image into dir and returns the stored filename.
func Save(dir string, data []byte) (string, error) {
	if len(data) == 0 {
		return "", errEmptyAsset
	}
	if len(data) > MaxBytes {
		return "", errors.Errorf("overlay asset exceeds %d bytes", MaxBytes)
	}

	ext, err := detectExt(data)
	if err != nil {
		return "", err
	}

	var buf [8]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return "", errors.Errorf("generate overlay asset name: %w", err)
	}
	name := "asset_" + hex.EncodeToString(buf[:]) + ext
	if !config.ValidOverlayAssetName(name) {
		return "", errors.Errorf("generated overlay asset name is invalid")
	}

	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", errors.Errorf("create overlay assets directory: %w", err, errors.String("path", dir))
	}

	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return "", errors.Errorf("write overlay asset: %w", err, errors.String("path", path))
	}
	return name, nil
}

// ServeFile writes a stored overlay asset to w when name is safe and present.
func ServeFile(w http.ResponseWriter, r *http.Request, dir, name string) {
	if !config.ValidOverlayAssetName(name) {
		http.NotFound(w, r)
		return
	}
	path := filepath.Join(dir, filepath.Base(name))
	http.ServeFile(w, r, path)
}

func detectExt(data []byte) (string, error) {
	if len(data) >= 8 && bytes.Equal(data[:8], []byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}) {
		return ".png", nil
	}
	if len(data) >= 3 && data[0] == 0xff && data[1] == 0xd8 && data[2] == 0xff {
		return ".jpg", nil
	}
	if len(data) >= 6 && (bytes.HasPrefix(data, []byte("GIF87a")) || bytes.HasPrefix(data, []byte("GIF89a"))) {
		return ".gif", nil
	}
	if len(data) >= 12 && bytes.Equal(data[:4], []byte("RIFF")) && bytes.Equal(data[8:12], []byte("WEBP")) {
		return ".webp", nil
	}

	trimmed := bytes.TrimSpace(data)
	if isSVG(trimmed) {
		if svgUnsafe(trimmed) {
			return "", ErrUnsafeSVG
		}
		return ".svg", nil
	}
	return "", ErrUnsupportedType
}

func isSVG(data []byte) bool {
	if bytes.HasPrefix(data, []byte("<svg")) {
		return true
	}
	return bytes.HasPrefix(data, []byte("<?xml")) && bytes.Contains(data, []byte("<svg"))
}

func svgUnsafe(data []byte) bool {
	lower := bytes.ToLower(data)
	return bytes.Contains(lower, []byte("<script")) ||
		bytes.Contains(lower, []byte("javascript:")) ||
		bytes.Contains(lower, []byte("onload=")) ||
		bytes.Contains(lower, []byte("onerror="))
}

// ReadLimited copies r into memory with a hard MaxBytes cap.
func ReadLimited(r io.Reader) ([]byte, error) {
	data, err := io.ReadAll(io.LimitReader(r, MaxBytes+1))
	if err != nil {
		return nil, errors.Errorf("read overlay asset: %w", err)
	}
	if len(data) > MaxBytes {
		return nil, errors.Errorf("overlay asset exceeds %d bytes", MaxBytes)
	}
	if !utf8.Valid(data) && looksLikeText(data) {
		return nil, ErrUnsupportedType
	}
	return data, nil
}

func looksLikeText(data []byte) bool {
	sample := data
	if len(sample) > 64 {
		sample = sample[:64]
	}
	return !bytes.Contains(sample, []byte{0}) && strings.Contains(string(sample), "<")
}
