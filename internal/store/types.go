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

// ViewerContractStatus describes the lifecycle state of a viewer contract.
type ViewerContractStatus string

const (
	// ViewerContractActive is the single contract that can be announced or settled.
	ViewerContractActive ViewerContractStatus = "active"
	// ViewerContractAwarded records a contract settled with a canonical viewer.
	ViewerContractAwarded ViewerContractStatus = "awarded"
	// ViewerContractClosed records a contract settled without a result.
	ViewerContractClosed ViewerContractStatus = "closed"
)

// ViewerContract is the durable, snapshotted promise made to viewers.
type ViewerContract struct {
	ID                   string
	Status               ViewerContractStatus
	Title                string
	Objective            string
	RewardID             string
	RewardName           string
	RewardPoints         int
	RewardSplashTemplate string
	RewardSound          string
	RewardDurationMs     int
	RewardImageAsset     string
	RewardSoundFile      string
	RewardSoundVolume    int
	RewardLayout         string
	RewardImageFit       string
	RewardImageSizePct   int
	WinnerViewerID       string
	AnnouncedAt          time.Time
	SettledAt            time.Time
}

// RewardHistoryEntry is one public, award-only journal entry.
type RewardHistoryEntry struct {
	ID                string
	Kind              InteractionEventKind
	ViewerID          string
	ViewerDisplayName string
	RewardID          string
	RewardName        string
	Points            int
	CreatedAt         time.Time
}

// RewardHistoryQuery describes one bounded keyset page of award history.
type RewardHistoryQuery struct {
	ViewerID string
	Limit    int
	Cursor   string
}

// RewardHistoryPage is a history result and its optional next-page cursor.
type RewardHistoryPage struct {
	Entries    []RewardHistoryEntry
	NextCursor string
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
