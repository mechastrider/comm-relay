package api

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"

	"github.com/muonsoft/errors"
)

const oauthStateTTL = 10 * time.Minute

type oauthStateStore struct {
	mu     sync.Mutex
	states map[string]time.Time
}

func newOAuthStateStore() *oauthStateStore {
	return &oauthStateStore{states: make(map[string]time.Time)}
}

func (s *oauthStateStore) issue() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", errors.Errorf("generate oauth state: %w", err)
	}
	state := hex.EncodeToString(b)

	s.mu.Lock()
	defer s.mu.Unlock()

	s.purgeLocked(time.Now())
	s.states[state] = time.Now().Add(oauthStateTTL)
	return state, nil
}

func (s *oauthStateStore) consume(state string) bool {
	if state == "" {
		return false
	}

	now := time.Now()

	s.mu.Lock()
	defer s.mu.Unlock()

	s.purgeLocked(now)

	expiry, ok := s.states[state]
	if !ok || now.After(expiry) {
		return false
	}

	delete(s.states, state)
	return true
}

func (s *oauthStateStore) purgeLocked(now time.Time) {
	for state, expiry := range s.states {
		if now.After(expiry) {
			delete(s.states, state)
		}
	}
}
