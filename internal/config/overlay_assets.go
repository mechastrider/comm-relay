package config

import (
	"path/filepath"
	"regexp"
	"strings"
)

var overlayAssetNameRe = regexp.MustCompile(`(?i)^[a-z0-9][a-z0-9._-]{0,127}\.(png|jpe?g|webp|gif|svg|mp3|wav)$`)

// ValidOverlayAssetName reports whether name is a safe stored overlay asset filename.
func ValidOverlayAssetName(name string) bool {
	return validOverlayAssetName(name)
}

func validOverlayAssetName(name string) bool {
	name = strings.TrimSpace(name)
	if name == "" {
		return false
	}
	if name != filepath.Base(name) {
		return false
	}
	if strings.Contains(name, "..") {
		return false
	}
	return overlayAssetNameRe.MatchString(name)
}
