package bus

// EventType identifies bus events.
type EventType string

const (
	// EventChatMessageReceived is published when a connector ingests a chat line.
	EventChatMessageReceived EventType = "ChatMessageReceived"
)

// Event is a typed bus payload.
type Event struct {
	Type    EventType
	Message ChatMessage
}

// ChatMessageReceived builds an event for a new chat message.
func ChatMessageReceived(msg ChatMessage) Event {
	return Event{
		Type:    EventChatMessageReceived,
		Message: msg,
	}
}
