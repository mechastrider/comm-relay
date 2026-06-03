package config

import (
	"sync"

	"github.com/muonsoft/errors"
)

// Store provides thread-safe access to persisted settings.
type Store struct {
	mu   sync.RWMutex
	path string
	cfg  Config
}

// NewStore wraps an already-loaded config for runtime read/write.
func NewStore(path string, cfg *Config) (*Store, error) {
	if cfg == nil {
		return nil, errors.New("config is required")
	}
	if path == "" {
		return nil, errors.New("config path is required")
	}

	return &Store{
		path: path,
		cfg:  *cfg,
	}, nil
}

// Snapshot returns a copy of the current settings.
func (s *Store) Snapshot() Config {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.cfg
}

// Replace validates, persists, and stores new settings.
func (s *Store) Replace(cfg Config) error {
	if err := cfg.Validate(); err != nil {
		return err
	}
	if err := cfg.Save(s.path); err != nil {
		return errors.Errorf("save config: %w", err)
	}

	s.mu.Lock()
	s.cfg = cfg
	s.mu.Unlock()

	return nil
}
