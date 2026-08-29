package store

import (
	"path/filepath"

	"github.com/muonsoft/errors"
)

const dbFileName = "comm-relay.db"

// DBPath returns the absolute path to comm-relay.db beside config.json.
func DBPath(configPath string) (string, error) {
	abs, err := filepath.Abs(configPath)
	if err != nil {
		return "", errors.Errorf("resolve config path: %w", err)
	}

	return filepath.Join(filepath.Dir(abs), dbFileName), nil
}
