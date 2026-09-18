package command

import (
	"strings"
	"sync"
	"time"

	"github.com/mechastrider/comm-relay/internal/nicks"
	"github.com/mechastrider/comm-relay/internal/store"
)

// Matcher matches chat lines against the command catalog and tracks per-viewer cooldowns.
type Matcher struct {
	store        *store.Store
	mu           sync.Mutex
	cooldown     map[cooldownKey]time.Time
	outcomes     map[messageOutcomeKey]storedMessageOutcome
	outcomeOrder []messageOutcomeKey
	now          func() time.Time
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
		outcomes: make(map[messageOutcomeKey]storedMessageOutcome),
		now:      time.Now,
	}
}

// ParseLine returns the first bang token and trimmed remainder (may contain spaces).
func ParseLine(line string) (token, remainder string, ok bool) {
	normalized := strings.TrimSpace(line)
	if !strings.HasPrefix(normalized, "!") {
		return "", "", false
	}

	body := strings.TrimSpace(normalized[1:])
	if body == "" {
		return "", "", false
	}

	sep := strings.IndexAny(body, " \t")
	if sep < 0 {
		return strings.ToLower(body), "", true
	}

	token = strings.ToLower(strings.TrimSpace(body[:sep]))
	remainder = strings.TrimSpace(body[sep:])
	if token == "" {
		return "", "", false
	}
	return token, remainder, true
}

// Lookup matches an enabled command without consuming cooldown.
func (m *Matcher) Lookup(line string) (*store.Command, bool) {
	match, ok := m.LookupMatch(line)
	if !ok || match.Command == nil {
		return nil, false
	}
	return match.Command, true
}

// LookupMatch resolves a bang line to a command without consuming cooldown.
func (m *Matcher) LookupMatch(line string) (LookupMatch, bool) {
	if m == nil || m.store == nil {
		return LookupMatch{}, false
	}

	token, remainder, ok := ParseLine(line)
	if !ok {
		return LookupMatch{}, false
	}

	commands, err := m.store.ListCommands()
	if err != nil {
		return LookupMatch{Token: token, Remainder: remainder}, true
	}

	if match, matched := m.matchTokenInCatalog(token, remainder, commands); matched {
		return match, true
	}

	fuzzyIDs := fuzzyMatchCommandIDs(token, commands)
	switch len(fuzzyIDs) {
	case 0:
		return LookupMatch{Token: token, Remainder: remainder}, true
	case 1:
		id := fuzzyIDs[0]
		for i := range commands {
			if commands[i].ID != id {
				continue
			}
			cmd := &commands[i]
			if RequiresEmptyRemainder(cmd.Action) && strings.TrimSpace(remainder) != "" {
				return LookupMatch{}, false
			}
			return LookupMatch{
				Command:   cmd,
				Kind:      MatchKindFuzzy,
				Token:     token,
				Remainder: remainder,
			}, true
		}
		return LookupMatch{Token: token, Remainder: remainder}, true
	default:
		return LookupMatch{Token: token, Remainder: remainder, AmbiguousTypo: true}, true
	}
}

func (m *Matcher) matchTokenInCatalog(token, remainder string, commands []store.Command) (LookupMatch, bool) {
	for i := range commands {
		cmd := &commands[i]
		if !cmd.Enabled || cmd.Trigger != token {
			continue
		}
		if RequiresEmptyRemainder(cmd.Action) && strings.TrimSpace(remainder) != "" {
			return LookupMatch{}, false
		}
		return LookupMatch{Command: cmd, Kind: MatchKindExact, Token: token, Remainder: remainder}, true
	}

	for i := range commands {
		cmd := &commands[i]
		if !cmd.Enabled {
			continue
		}
		for _, alias := range cmd.Aliases {
			if alias != token {
				continue
			}
			if RequiresEmptyRemainder(cmd.Action) && strings.TrimSpace(remainder) != "" {
				return LookupMatch{}, false
			}
			return LookupMatch{Command: cmd, Kind: MatchKindAlias, Token: token, Remainder: remainder}, true
		}
	}

	for i := range commands {
		cmd := &commands[i]
		if cmd.Enabled {
			continue
		}
		if cmd.Trigger == token {
			return LookupMatch{Token: token, Remainder: remainder}, true
		}
		for _, alias := range cmd.Aliases {
			if alias == token {
				return LookupMatch{Token: token, Remainder: remainder}, true
			}
		}
	}

	return LookupMatch{}, false
}

func fuzzyMatchCommandIDs(token string, commands []store.Command) []string {
	const minCanonicalLen = 4

	seen := make(map[string]struct{})
	var ids []string

	for i := range commands {
		cmd := commands[i]
		if !cmd.Enabled || len(cmd.Trigger) < minCanonicalLen {
			continue
		}
		names := make([]string, 0, 1+len(cmd.Aliases))
		names = append(names, cmd.Trigger)
		names = append(names, cmd.Aliases...)

		matched := false
		for _, name := range names {
			if nicks.DamerauLevenshtein(token, name) <= 1 {
				matched = true
				break
			}
		}
		if !matched {
			continue
		}
		if _, exists := seen[cmd.ID]; exists {
			continue
		}
		seen[cmd.ID] = struct{}{}
		ids = append(ids, cmd.ID)
	}

	return ids
}

// TryFire consumes cooldown and returns true when the command may perform its configured action.
func (m *Matcher) TryFire(platform, userID string, cmd *store.Command) bool {
	if m == nil || cmd == nil {
		return false
	}

	key := cooldownKey{
		platform:  strings.TrimSpace(platform),
		userID:    strings.TrimSpace(userID),
		commandID: cmd.ID,
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	now := m.now()
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
