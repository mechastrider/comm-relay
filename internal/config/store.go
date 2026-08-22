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

// Path returns the config file path used by the store.
func (s *Store) Path() string {
	return s.path
}

// Snapshot returns a copy of the current settings.
func (s *Store) Snapshot() Config {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.cfg
}

// Replace validates, persists, and stores new settings under the write lock
// (same atomicity as Mutate) so concurrent Mutate callers cannot diverge disk vs memory.
func (s *Store) Replace(cfg Config) error {
	return s.Mutate(func(current *Config) error {
		*current = cfg
		return nil
	})
}

// Mutate updates settings under the store lock, then validates and persists.
func (s *Store) Mutate(fn func(*Config) error) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	cfg := s.cfg
	if err := fn(&cfg); err != nil {
		return err
	}
	if err := cfg.Validate(); err != nil {
		return err
	}
	if err := cfg.Save(s.path); err != nil {
		return errors.Errorf("save config: %w", err)
	}

	s.cfg = cfg
	return nil
}
