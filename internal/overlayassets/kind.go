package overlayassets

import "strings"

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

// ParseKind normalizes an upload kind query/form value.
func ParseKind(raw string) AssetKind {
	switch strings.TrimSpace(strings.ToLower(raw)) {
	case string(KindAlertImage):
		return KindAlertImage
	case string(KindAlertSound):
		return KindAlertSound
	default:
		return KindPanel
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
