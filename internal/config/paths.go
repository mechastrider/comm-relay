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

	appDir := filepath.Join(dir, "comm-relay")
	if err := os.MkdirAll(appDir, 0o700); err != nil {
		return "", errors.Errorf("create config directory: %w", err)
	}

	return filepath.Join(appDir, "config.json"), nil
}

// LogDir returns the session log directory for the given config.json path.
func LogDir(configPath string) (string, error) {
	abs, err := filepath.Abs(configPath)
	if err != nil {
		return "", errors.Errorf("resolve config path: %w", err)
	}

	return filepath.Join(filepath.Dir(abs), "logs"), nil
}
