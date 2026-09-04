package overlayassets

import (
	"bytes"
	"encoding/binary"
	"image"
	_ "image/jpeg" // JPEG decoder for image.DecodeConfig
	_ "image/png"  // PNG decoder for image.DecodeConfig

	"github.com/muonsoft/errors"
	_ "golang.org/x/image/webp" // WebP decoder for image.DecodeConfig
)

const (
	maxAlertImagePixels   = 16_000_000
	maxAlertImageLongSide = 4096
)

var (
	// ErrAnimatedImage is returned for animated WebP or GIF alert uploads.
	ErrAnimatedImage = errors.New("animated images are not supported for alerts")
	// ErrImageDimensions is returned when decoded dimensions exceed limits.
	ErrImageDimensions = errors.New("image dimensions exceed the allowed limit")
)

// ValidateAlertImage inspects static PNG, JPEG, or WebP bytes for alert uploads.
func ValidateAlertImage(data []byte) error {
	if len(data) >= 6 && (bytes.HasPrefix(data, []byte("GIF87a")) || bytes.HasPrefix(data, []byte("GIF89a"))) {
		return ErrAnimatedImage
	}
	if isSVG(trimAssetPrefix(data)) {
		return ErrUnsupportedType
	}
	if isAnimatedWebP(data) {
		return ErrAnimatedImage
	}

	cfg, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return errors.Errorf("decode alert image config: %w", err)
	}
	switch format {
	case "png", "jpeg", "webp":
	default:
		return ErrUnsupportedType
	}

	width := cfg.Width
	height := cfg.Height
	if width <= 0 || height <= 0 {
		return ErrUnsupportedType
	}
	if int64(width)*int64(height) > maxAlertImagePixels {
		return ErrImageDimensions
	}
	if width > maxAlertImageLongSide || height > maxAlertImageLongSide {
		return ErrImageDimensions
	}

	return nil
}

func isAnimatedWebP(data []byte) bool {
	if len(data) < 16 || !bytes.Equal(data[0:4], []byte("RIFF")) || !bytes.Equal(data[8:12], []byte("WEBP")) {
		return false
	}

	offset := 12
	for offset+8 <= len(data) {
		fourcc := string(data[offset : offset+4])
		size := int(binary.LittleEndian.Uint32(data[offset+4 : offset+8]))
		chunkStart := offset + 8
		if chunkStart > len(data) {
			break
		}
		if fourcc == "ANIM" {
			return true
		}
		if fourcc == "VP8X" && size >= 4 && chunkStart+4 <= len(data) {
			if data[chunkStart]&0x02 != 0 {
				return true
			}
		}
		offset = chunkStart + size
		if size%2 == 1 {
			offset++
		}
	}

	return false
}
