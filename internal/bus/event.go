package bus

import "github.com/mechastrider/comm-relay/internal/leaderboard"

// EventType identifies bus events.
type EventType string

const (
	// EventChatMessageReceived is published when a connector ingests a chat line.
	EventChatMessageReceived EventType = "ChatMessageReceived"
	// EventLeaderboardVisibilityChanged is published for every authoritative visibility transition.
	EventLeaderboardVisibilityChanged EventType = "LeaderboardVisibilityChanged"
)

// Event is a typed bus payload.
type Event struct {
	Type                  EventType
	Message               ChatMessage
	LeaderboardVisibility leaderboard.Snapshot
}

// LeaderboardVisibilityChanged builds an event for a visibility transition.
func LeaderboardVisibilityChanged(snapshot leaderboard.Snapshot) Event {
	return Event{
		Type:                  EventLeaderboardVisibilityChanged,
		LeaderboardVisibility: snapshot,
	}
}

// ChatMessageReceived builds an event for a new chat message.
func ChatMessageReceived(msg ChatMessage) Event {
	return Event{
		Type:    EventChatMessageReceived,
		Message: msg,
	}
}
