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
	// MaxBytes is the maximum accepted panel overlay asset size.
	MaxBytes = MaxPanelBytes
)

var (
	// ErrUnsupportedType is returned when the bytes are not a supported image.
	ErrUnsupportedType = errors.New("unsupported overlay asset type")
	// ErrUnsafeSVG is returned when an SVG contains executable content.
	ErrUnsafeSVG = errors.New("svg asset contains unsafe content")
	// ErrModernImageFormat is returned for HEIC/AVIF uploads that need conversion first.
	ErrModernImageFormat = errors.New("HEIC and AVIF are not supported; use PNG or JPEG")
	errEmptyAsset        = errors.New("overlay asset is empty")
)

// DirForConfig returns the overlay-assets directory next to config.json.
func DirForConfig(configPath string) string {
	return filepath.Join(filepath.Dir(configPath), "overlay-assets")
}

// Save writes a sniffed asset into dir and returns the stored filename.
func Save(dir string, kind AssetKind, data []byte) (string, error) {
	if len(data) == 0 {
		return "", errEmptyAsset
	}

	limit := maxBytesForKind(kind)
	if len(data) > limit {
		return "", errors.Errorf("overlay asset exceeds %d bytes", limit)
	}

	ext, err := detectExtForKind(kind, data)
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

// Delete removes a stored overlay asset when present.
func Delete(dir, name string) error {
	if !config.ValidOverlayAssetName(name) {
		return errors.New("invalid overlay asset name")
	}
	path := filepath.Join(dir, filepath.Base(name))
	if err := os.Remove(path); err != nil {
		if os.IsNotExist(err) {
			return errors.New("overlay asset not found")
		}
		return errors.Errorf("delete overlay asset: %w", err, errors.String("path", path))
	}
	return nil
}

// FileExists reports whether a safe stored filename is present in dir.
func FileExists(dir, name string) bool {
	if !config.ValidOverlayAssetName(name) {
		return false
	}
	path := filepath.Join(dir, filepath.Base(name))
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
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

func detectExtForKind(kind AssetKind, data []byte) (string, error) {
	switch kind {
	case KindAlertImage:
		if err := ValidateAlertImage(data); err != nil {
			return "", err
		}
		return detectStaticImageExt(data)
	case KindAlertSound:
		if err := ValidateAlertSoundDuration(data); err != nil {
			return "", err
		}
		return detectAudioExt(data)
	default:
		return detectPanelExt(data)
	}
}

func detectPanelExt(data []byte) (string, error) {
	return detectExt(data)
}

func detectStaticImageExt(data []byte) (string, error) {
	if len(data) >= 8 && bytes.Equal(data[:8], []byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}) {
		return ".png", nil
	}
	if len(data) >= 3 && data[0] == 0xff && data[1] == 0xd8 && data[2] == 0xff {
		return ".jpg", nil
	}
	if len(data) >= 12 && bytes.Equal(data[:4], []byte("RIFF")) && bytes.Equal(data[8:12], []byte("WEBP")) {
		return ".webp", nil
	}
	if err := detectModernImageFormat(data); err != nil {
		return "", err
	}
	return "", ErrUnsupportedType
}

func detectAudioExt(data []byte) (string, error) {
	if len(data) >= 12 && bytes.Equal(data[0:4], []byte("RIFF")) && bytes.Equal(data[8:12], []byte("WAVE")) {
		return ".wav", nil
	}
	if isMP3(data) {
		return ".mp3", nil
	}
	return "", ErrUnsupportedType
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
	if err := detectModernImageFormat(data); err != nil {
		return "", err
	}

	trimmed := trimAssetPrefix(data)
	if isSVG(trimmed) {
		if svgUnsafe(trimmed) {
			return "", ErrUnsafeSVG
		}
		return ".svg", nil
	}
	return "", ErrUnsupportedType
}

func trimAssetPrefix(data []byte) []byte {
	data = bytes.TrimSpace(data)
	return bytes.TrimPrefix(data, []byte{0xEF, 0xBB, 0xBF})
}

func detectModernImageFormat(data []byte) error {
	if len(data) < 12 || !bytes.Equal(data[4:8], []byte("ftyp")) {
		return nil
	}
	brand := strings.ToLower(string(data[8:12]))
	switch brand {
	case "heic", "heix", "hevc", "hevx", "heif", "mif1", "msf1", "avif", "avis":
		return ErrModernImageFormat
	default:
		return nil
	}
}

func isSVG(data []byte) bool {
	if len(data) == 0 {
		return false
	}
	lower := bytes.ToLower(data)
	if bytes.HasPrefix(lower, []byte("<svg")) {
		return true
	}
	if bytes.HasPrefix(lower, []byte("<?xml")) || bytes.HasPrefix(lower, []byte("<!doctype svg")) {
		return bytes.Contains(lower, []byte("<svg"))
	}
	return false
}

func svgUnsafe(data []byte) bool {
	lower := bytes.ToLower(data)
	return bytes.Contains(lower, []byte("<script")) ||
		bytes.Contains(lower, []byte("javascript:")) ||
		bytes.Contains(lower, []byte("onload=")) ||
		bytes.Contains(lower, []byte("onerror="))
}

// ReadLimited copies r into memory with a hard maxBytes cap.
func ReadLimited(r io.Reader, maxBytes int) ([]byte, error) {
	if maxBytes < 1 {
		maxBytes = MaxPanelBytes
	}
	data, err := io.ReadAll(io.LimitReader(r, int64(maxBytes)+1))
	if err != nil {
		return nil, errors.Errorf("read overlay asset: %w", err)
	}
	if len(data) > maxBytes {
		return nil, errors.Errorf("overlay asset exceeds %d bytes", maxBytes)
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
