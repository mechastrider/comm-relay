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

// GreetingKind identifies one of the two fixed automatic greeting definitions.
type GreetingKind string

// ProgressionMetric values identify supported progression facts.
const (
	// GreetingNewViewer identifies the first-ever ordinary message greeting.
	GreetingNewViewer GreetingKind = "new_viewer"
	// GreetingReturningViewer identifies the first ordinary message after a new stream.
	GreetingReturningViewer GreetingKind = "returning_viewer"
)

// Greeting is a persisted fixed automatic greeting definition.
type Greeting struct {
	ID             GreetingKind
	Enabled        bool
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
	ID                        string
	CustomAvatar              string
	LeaderboardHidden         bool
	GreetingsDisabled         bool
	ProgressionAlertsDisabled bool
	DisplayName               string
	DisplayNameOverride       string
	MessageCount              int
	XP                        int
	SessionMessageCount       int
	SessionXP                 int
	DayMessageCount           int
	DayXP                     int
	LastSeenAt                time.Time
	LastSeen                  LastSeenIdentity
	Platforms                 []string
	Identities                []Identity
}

// ProgressionMetric identifies a bounded historical fact used by an achievement.
type ProgressionMetric string

const (
	// ProgressionMetricMessageCount counts all-time chat messages.
	ProgressionMetricMessageCount ProgressionMetric = "message_count"
	// ProgressionMetricXP reads all-time XP.
	ProgressionMetricXP ProgressionMetric = "xp"
	// ProgressionMetricAwardCount counts grants for an award id.
	ProgressionMetricAwardCount ProgressionMetric = "award_count"
	// ProgressionMetricCommandCount counts successful command executions by id.
	ProgressionMetricCommandCount ProgressionMetric = "command_count"
	// ProgressionMetricSessionCount counts distinct participating sessions.
	ProgressionMetricSessionCount ProgressionMetric = "session_count"
	// ProgressionMetricContractWinCount counts awarded viewer contracts.
	ProgressionMetricContractWinCount ProgressionMetric = "contract_win_count"
)

// ProgressionLevel is an operator-editable XP threshold and title.
type ProgressionLevel struct {
	ID        string
	Title     string
	MinXP     int
	Announce  bool
	CreatedAt time.Time
	UpdatedAt time.Time
}

// AchievementRevision is the immutable fact condition for an achievement.
type AchievementRevision struct {
	AchievementID string
	Revision      int
	Metric        ProgressionMetric
	SubjectID     string
	SubjectLabel  string
	Target        int
	Repeatable    bool
	CreatedAt     time.Time
}

// AchievementDefinition is an operator-authored achievement and its active condition.
type AchievementDefinition struct {
	ID             string
	Name           string
	Description    string
	Enabled        bool
	Secret         bool
	Announce       bool
	ActiveRevision int
	DeletedAt      time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
	Revision       AchievementRevision
}

// AchievementUnlock preserves the condition and display text observed at an unlock.
type AchievementUnlock struct {
	ID            string
	ViewerID      string
	AchievementID string
	Revision      int
	Occurrence    int
	ProgressValue int
	Name          string
	Description   string
	Backfilled    bool
	UnlockedAt    time.Time
}

// ProgressionAlertSettings controls shared unlock-alert presentation.
type ProgressionAlertSettings struct {
	AchievementEnabled bool
	LevelEnabled       bool
	Layout             string
	Sound              string
	SoundVolume        int
	DurationMs         int
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

// ProgressionReconciliationStatus tracks the resumable silent backfill.
type ProgressionReconciliationStatus struct {
	BootstrapState      string
	RequestedGeneration int
	CompletedGeneration int
	Status              string
	LastViewerID        string
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

// ViewerProgression is the complete local progression read model for a
// visible viewer. API callers apply audience-specific secret filtering.
type ViewerProgression struct {
	ViewerID     string
	XP           int
	CurrentLevel *ProgressionLevel
	NextLevel    *ProgressionLevel
	Achievements []ViewerAchievementProgress
	Unlocks      []AchievementUnlock
}

// ViewerAchievementProgress joins the current rule with its durable viewer
// value and historical occurrence count.
type ViewerAchievementProgress struct {
	Definition  AchievementDefinition
	Value       int
	Occurrences int
}
