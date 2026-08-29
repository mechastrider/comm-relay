package store

import "time"

// ChatIdentity is the stable chat identity passed into the viewer store.
type ChatIdentity struct {
	Platform    string
	UserID      string
	Username    string
	DisplayName string
	AvatarURL   string
}

// Identity is a persisted platform identity linked to a canonical viewer.
type Identity struct {
	Platform    string
	UserID      string
	Username    string
	DisplayName string
	AvatarURL   string
	LastSeenAt  time.Time
}

// LastSeenIdentity holds the most recently seen platform identity for list payloads.
type LastSeenIdentity struct {
	Platform  string
	UserID    string
	Username  string
	AvatarURL string
}

// Viewer is a canonical viewer with period counters and linked identities.
type Viewer struct {
	ID                  string
	DisplayName         string
	DisplayNameOverride string
	MessageCount        int
	Score               int
	SessionMessageCount int
	SessionScore        int
	DayMessageCount     int
	DayScore            int
	LastSeenAt          time.Time
	LastSeen            LastSeenIdentity
	Identities          []Identity
}
