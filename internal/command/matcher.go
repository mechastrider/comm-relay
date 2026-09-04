package command

import (
	"strings"
	"sync"
	"time"

	"github.com/mechastrider/comm-relay/internal/store"
)

// Matcher matches chat lines against the command catalog and tracks per-viewer cooldowns.
type Matcher struct {
	store    *store.Store
	mu       sync.Mutex
	cooldown map[cooldownKey]time.Time
}

type cooldownKey struct {
	platform  string
	userID    string
	commandID string
}

// NewMatcher creates a matcher backed by the viewer store command catalog.
func NewMatcher(s *store.Store) *Matcher {
	return &Matcher{
		store:    s,
		cooldown: make(map[cooldownKey]time.Time),
	}
}

// ParseLine returns the command trigger when line is a whole-line bang command.
func ParseLine(line string) (trigger string, ok bool) {
	normalized := strings.ToLower(strings.TrimSpace(line))
	if !strings.HasPrefix(normalized, "!") {
		return "", false
	}

	trigger = strings.TrimSpace(normalized[1:])
	if trigger == "" {
		return "", false
	}
	if strings.ContainsAny(trigger, " \t") {
		return "", false
	}

	return trigger, true
}

// Lookup matches an enabled command without consuming cooldown.
func (m *Matcher) Lookup(line string) (*store.Command, bool) {
	if m == nil || m.store == nil {
		return nil, false
	}

	trigger, ok := ParseLine(line)
	if !ok {
		return nil, false
	}

	commands, err := m.store.ListCommands()
	if err != nil {
		return nil, false
	}

	for i := range commands {
		cmd := commands[i]
		if cmd.Enabled && cmd.Trigger == trigger {
			return &cmd, true
		}
	}

	return nil, false
}

// TryFire consumes cooldown and returns true when the command may fire an alert.
func (m *Matcher) TryFire(platform, userID string, cmd *store.Command) bool {
	if m == nil || cmd == nil {
		return false
	}

	now := time.Now()
	key := cooldownKey{
		platform:  strings.TrimSpace(platform),
		userID:    strings.TrimSpace(userID),
		commandID: cmd.ID,
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	if cmd.CooldownSeconds > 0 {
		if until, exists := m.cooldown[key]; exists && now.Before(until) {
			return false
		}
		m.cooldown[key] = now.Add(time.Duration(cmd.CooldownSeconds) * time.Second)
	}

	return true
}

// DisplayName prefers display name over username for template substitution.
func DisplayName(username, displayName string) string {
	if strings.TrimSpace(displayName) != "" {
		return displayName
	}

	return username
}
