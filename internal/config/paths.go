package config

import (
	"os"
	"path/filepath"

	"github.com/muonsoft/errors"
)

// DefaultUserConfigPath returns the per-user config.json path for desktop installs.
func DefaultUserConfigPath() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", errors.Errorf("resolve user config dir: %w", err)
	}

	appDir := filepath.Join(dir, "chat-relay")
	if err := os.MkdirAll(appDir, 0o700); err != nil {
		return "", errors.Errorf("create config directory: %w", err)
	}

	return filepath.Join(appDir, "config.json"), nil
}
