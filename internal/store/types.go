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

// Command is a persisted chat command catalog entry.
type Command struct {
	ID              string
	Action          string
	Trigger         string
	Enabled         bool
	CooldownSeconds int
	SplashTemplate  string
	Sound           string
	DurationMs      int
	ImageAsset      string
	SoundFile       string
	SoundVolume     int
	Layout          string
	ImageFit        string
	ImageSizePct    int
}

// AwardType is a persisted operator award catalog entry.
type AwardType struct {
	ID             string
	Name           string
	Points         int
	SplashTemplate string
	Sound          string
	DurationMs     int
	ImageAsset     string
	SoundFile      string
	SoundVolume    int
	Layout         string
	ImageFit       string
	ImageSizePct   int
}

// ActivitySettings controls silent activity XP grants on counted chat lines.
type ActivitySettings struct {
	IntervalSeconds int
	SessionLimit    int
	XP              int
}

// Enabled reports whether activity XP grants are active.
func (a ActivitySettings) Enabled() bool {
	return a.IntervalSeconds > 0 && a.SessionLimit > 0 && a.XP > 0
}

// Viewer is a canonical viewer with period counters and linked identities.
type Viewer struct {
	ID                  string
	CustomAvatar        string
	LeaderboardHidden   bool
	DisplayName         string
	DisplayNameOverride string
	MessageCount        int
	XP                  int
	SessionMessageCount int
	SessionXP           int
	DayMessageCount     int
	DayXP               int
	LastSeenAt          time.Time
	LastSeen            LastSeenIdentity
	Platforms           []string
	Identities          []Identity
}
