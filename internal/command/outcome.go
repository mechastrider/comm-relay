package command

import (
	"strings"

	"github.com/mechastrider/comm-relay/internal/store"
)

const (
	OutcomeStatusFired    = "fired"
	OutcomeStatusCooldown = "cooldown"
)

const maxStoredMessageOutcomes = 100

type messageOutcomeKey struct {
	platform  string
	messageID string
}

type storedMessageOutcome struct {
	trigger         string
	status          string
	viewerPlatform  string
	userID          string
	commandID       string
	cooldownSeconds int
}

// MessageOutcome is the public snapshot for a chat line command result.
type MessageOutcome struct {
	Trigger             string
	Status              string
	CooldownRemainingMs int
}

// CooldownRemainingMs returns milliseconds until the identity may fire the command again.
func (m *Matcher) CooldownRemainingMs(platform, userID string, cmd *store.Command) int {
	if m == nil || cmd == nil || cmd.CooldownSeconds <= 0 {
		return 0
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	return m.cooldownRemainingMsLocked(platform, userID, cmd.ID)
}

func (m *Matcher) cooldownRemainingMsLocked(platform, userID, commandID string) int {
	key := cooldownKey{
		platform:  strings.TrimSpace(platform),
		userID:    strings.TrimSpace(userID),
		commandID: commandID,
	}
	until, exists := m.cooldown[key]
	if !exists {
		return 0
	}
	now := m.now()
	if !now.Before(until) {
		return 0
	}
	remaining := until.Sub(now).Milliseconds()
	if remaining < 0 {
		return 0
	}
	return int(remaining)
}

// RecordMessageOutcome remembers the latest outcome for a chat line (bounded map).
func (m *Matcher) RecordMessageOutcome(
	messagePlatform, messageID,
	viewerPlatform, userID string,
	cmd *store.Command,
	fired bool,
) MessageOutcome {
	if m == nil || cmd == nil {
		return MessageOutcome{}
	}

	messagePlatform = strings.TrimSpace(messagePlatform)
	messageID = strings.TrimSpace(messageID)
	viewerPlatform = strings.TrimSpace(viewerPlatform)
	userID = strings.TrimSpace(userID)

	status := OutcomeStatusFired
	if !fired {
		status = OutcomeStatusCooldown
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	if messagePlatform != "" && messageID != "" {
		key := messageOutcomeKey{platform: messagePlatform, messageID: messageID}
		m.outcomes[key] = storedMessageOutcome{
			trigger:         cmd.Trigger,
			status:          status,
			viewerPlatform:  viewerPlatform,
			userID:          userID,
			commandID:       cmd.ID,
			cooldownSeconds: cmd.CooldownSeconds,
		}
		m.touchOutcomeKey(key)
	}

	return m.messageOutcomeLocked(messagePlatform, messageID)
}

// MessageOutcome returns a stored outcome with cooldown remaining refreshed at read time.
func (m *Matcher) MessageOutcome(messagePlatform, messageID string) (MessageOutcome, bool) {
	if m == nil {
		return MessageOutcome{}, false
	}

	messagePlatform = strings.TrimSpace(messagePlatform)
	messageID = strings.TrimSpace(messageID)
	if messagePlatform == "" || messageID == "" {
		return MessageOutcome{}, false
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	out := m.messageOutcomeLocked(messagePlatform, messageID)
	if out.Trigger == "" {
		return MessageOutcome{}, false
	}
	return out, true
}

func (m *Matcher) messageOutcomeLocked(messagePlatform, messageID string) MessageOutcome {
	key := messageOutcomeKey{platform: messagePlatform, messageID: messageID}
	stored, ok := m.outcomes[key]
	if !ok {
		return MessageOutcome{}
	}

	remaining := 0
	if stored.cooldownSeconds > 0 {
		remaining = m.cooldownRemainingMsLocked(stored.viewerPlatform, stored.userID, stored.commandID)
	}

	return MessageOutcome{
		Trigger:             stored.trigger,
		Status:              stored.status,
		CooldownRemainingMs: remaining,
	}
}

func (m *Matcher) touchOutcomeKey(key messageOutcomeKey) {
	for i, existing := range m.outcomeOrder {
		if existing == key {
			m.outcomeOrder = append(m.outcomeOrder[:i], m.outcomeOrder[i+1:]...)
			break
		}
	}
	m.outcomeOrder = append(m.outcomeOrder, key)
	for len(m.outcomeOrder) > maxStoredMessageOutcomes {
		evict := m.outcomeOrder[0]
		m.outcomeOrder = m.outcomeOrder[1:]
		delete(m.outcomes, evict)
	}
}
