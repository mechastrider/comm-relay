package recap

import "time"

// CaptureInput carries normalized public session aggregates used to build a snapshot.
type CaptureInput struct {
	Totals            Totals
	Ranking           []CaptureRankingEntry
	AchievementGroups []CaptureAchievementGroup
}

// CaptureRankingEntry is one public ranking row at capture time.
type CaptureRankingEntry struct {
	Rank         int
	DisplayName  string
	PortraitURL  string
	XP           int
	MessageCount int
	Title        string
}

// CaptureAchievementGroup groups repeated unlocks at capture time.
type CaptureAchievementGroup struct {
	ViewerDisplayName string
	ViewerPortraitURL string
	AchievementID     string
	Revision          int
	Name              string
	Description       string
	Count             int
	LatestUnlockedAt  time.Time
}
