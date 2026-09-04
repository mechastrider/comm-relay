package store

import (
	"database/sql"
	"net/url"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
)

var (
	catalogImageAssetExtRe = regexp.MustCompile(`(?i)\.(png|jpe?g|webp)$`)
	catalogSoundFileExtRe  = regexp.MustCompile(`(?i)\.(mp3|wav)$`)
)

const (
	defaultCatalogSoundVolume = 70
	defaultCatalogLayout      = "card"
)

// DefaultCatalogSoundVolume is the default alert sound volume for catalog items.
const DefaultCatalogSoundVolume = defaultCatalogSoundVolume

// DefaultCatalogLayout is the default alert layout for catalog items.
const DefaultCatalogLayout = defaultCatalogLayout

var allowedCatalogLayouts = map[string]bool{
	"card":       true,
	"banner":     true,
	"fullscreen": true,
}

// NormalizeCatalogSoundVolume clamps and defaults catalog alert volume.
func NormalizeCatalogSoundVolume(volume int) int {
	if volume < 0 {
		return 0
	}
	if volume > 100 {
		return 100
	}
	return volume
}

// NormalizeCatalogLayout returns a supported layout value.
func NormalizeCatalogLayout(layout string) string {
	value := strings.TrimSpace(strings.ToLower(layout))
	if allowedCatalogLayouts[value] {
		return value
	}
	return defaultCatalogLayout
}

func validateCatalogAssetFilename(field, value string, extRe *regexp.Regexp) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	if trimmed != filepath.Base(trimmed) {
		return field + " must be a stored overlay asset filename"
	}
	if strings.Contains(trimmed, "..") {
		return field + " must be a stored overlay asset filename"
	}
	if strings.Contains(trimmed, "\\") || strings.Contains(trimmed, "/") {
		return field + " must be a stored overlay asset filename"
	}
	if strings.Contains(trimmed, ":") {
		return field + " must be a stored overlay asset filename"
	}
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		return field + " must be a stored overlay asset filename"
	}
	if _, err := url.Parse(trimmed); err == nil && strings.Contains(trimmed, "://") {
		return field + " must be a stored overlay asset filename"
	}
	if !config.ValidOverlayAssetName(trimmed) || !extRe.MatchString(trimmed) {
		return field + " must be a stored overlay asset filename"
	}
	return ""
}

// ValidateCatalogImageAssetFilename reports whether an alert image filename is safe.
func ValidateCatalogImageAssetFilename(value string) string {
	return validateCatalogAssetFilename("image_asset", value, catalogImageAssetExtRe)
}

// ValidateCatalogSoundFileFilename reports whether an alert sound filename is safe.
func ValidateCatalogSoundFileFilename(value string) string {
	return validateCatalogAssetFilename("sound_file", value, catalogSoundFileExtRe)
}

// ValidateCatalogSoundVolumeField validates a volume percentage.
func ValidateCatalogSoundVolumeField(volume int) string {
	if volume < 0 || volume > 100 {
		return "volume must be between 0 and 100"
	}
	return ""
}

// ValidateCatalogLayoutField validates a layout slug.
func ValidateCatalogLayoutField(layout string) string {
	value := strings.TrimSpace(strings.ToLower(layout))
	if value == "" {
		return ""
	}
	if !allowedCatalogLayouts[value] {
		return "choose card, banner, or fullscreen"
	}
	return ""
}

func nullString(value string) sql.NullString {
	if strings.TrimSpace(value) == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: strings.TrimSpace(value), Valid: true}
}

func validateCommandMediaFields(imageAsset, soundFile string, soundVolume int, layout string) map[string]string {
	fields := map[string]string{}
	if msg := ValidateCatalogImageAssetFilename(imageAsset); msg != "" {
		fields["image_asset"] = msg
	}
	if msg := ValidateCatalogSoundFileFilename(soundFile); msg != "" {
		fields["sound_file"] = msg
	}
	if msg := ValidateCatalogSoundVolumeField(soundVolume); msg != "" {
		fields["sound_volume"] = msg
	}
	if msg := ValidateCatalogLayoutField(layout); msg != "" {
		fields["layout"] = msg
	}
	return fields
}

func validateAwardMediaFields(imageAsset, soundFile string, soundVolume int, layout string) map[string]string {
	return validateCommandMediaFields(imageAsset, soundFile, soundVolume, layout)
}

type catalogMediaValidationErr struct {
	fields map[string]string
}

func (e catalogMediaValidationErr) Error() string {
	return "catalog media validation failed"
}

func catalogMediaValidationError(fields map[string]string) error {
	return catalogMediaValidationErr{fields: fields}
}

// CatalogMediaFields extracts field errors from catalog media validation failures.
func CatalogMediaFields(err error) map[string]string {
	if target, ok := errors.As[catalogMediaValidationErr](err); ok {
		return target.fields
	}
	return nil
}
