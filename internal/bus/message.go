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
	AvatarURL   string
	Badges      []string
	Timestamp   time.Time
}
