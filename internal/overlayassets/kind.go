package overlayassets

import (
	"strings"

	"github.com/muonsoft/errors"
)

// AssetKind selects upload validation rules for overlay assets.
type AssetKind string

const (
	// KindPanel is the Studio panel image upload (512 KiB, SVG allowed).
	KindPanel AssetKind = "panel"
	// KindAlertImage is a static alert portrait (PNG/JPEG/WebP up to 4 MiB).
	KindAlertImage AssetKind = "alert_image"
	// KindAlertSound is an alert sound (MP3/WAV up to 5 MiB, 1–15 s).
	KindAlertSound AssetKind = "alert_sound"
)

const (
	// MaxPanelBytes is the maximum accepted panel image size.
	MaxPanelBytes = 512 << 10
	// MaxAlertImageBytes is the maximum accepted alert image size.
	MaxAlertImageBytes = 4 << 20
	// MaxAlertSoundBytes is the maximum accepted alert sound size.
	MaxAlertSoundBytes = 5 << 20
	// MaxUploadBodyBytes is the HTTP multipart body cap (largest kind + overhead).
	MaxUploadBodyBytes = MaxAlertSoundBytes + 64<<10
)

// ErrInvalidKind is returned when an upload kind is present but not allowed.
var ErrInvalidKind = errors.New("invalid asset kind")

// ParseKind normalizes an upload kind query/form value.
func ParseKind(raw string) (AssetKind, error) {
	switch strings.TrimSpace(strings.ToLower(raw)) {
	case "", string(KindPanel):
		return KindPanel, nil
	case string(KindAlertImage):
		return KindAlertImage, nil
	case string(KindAlertSound):
		return KindAlertSound, nil
	default:
		return "", ErrInvalidKind
	}
}

func maxBytesForKind(kind AssetKind) int {
	switch kind {
	case KindAlertImage:
		return MaxAlertImageBytes
	case KindAlertSound:
		return MaxAlertSoundBytes
	default:
		return MaxPanelBytes
	}
}
