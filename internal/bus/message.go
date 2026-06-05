package bus

import "time"

// ChatMessage is the unified chat payload produced by all platform connectors.
type ChatMessage struct {
	ID          string
	Platform    string
	UserID      string
	Username    string
	DisplayName string
	Message     string
	Fragments   []MessageFragment
	AvatarURL   string
	Badges      []string
	Timestamp   time.Time
}
