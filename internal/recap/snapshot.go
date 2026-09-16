// Package recap defines the bounded public stream-recap snapshot and runtime visibility state.
package recap

import (
	"encoding/json"
	"net/url"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
)

const (
	// Version is the supported recap payload schema version.
	Version = 1

	maxIdentityLen        = 128
	maxDisplayNameRunes   = 64
	maxDescriptionRunes   = 240
	maxTitleRunes         = 64
	maxRankingRows        = 5
	maxAchievementGroups  = 6
	overlayAssetURLPrefix = "/overlay/assets/"
)

// ErrInvalidSnapshot is returned when a recap payload fails validation.
var ErrInvalidSnapshot = errors.New("invalid stream recap snapshot")

// Totals aggregates participation for one captured session.
type Totals struct {
	ViewerCount  int `json:"viewer_count"`
	MessageCount int `json:"message_count"`
	XP           int `json:"xp"`
}

// RankingEntry is one public Top 5 row snapshotted at capture time.
type RankingEntry struct {
	Rank         int    `json:"rank"`
	DisplayName  string `json:"display_name"`
	PortraitURL  string `json:"portrait_url,omitempty"`
	XP           int    `json:"xp"`
	MessageCount int    `json:"message_count"`
	Title        string `json:"title,omitempty"`
}

// AchievementGroup groups repeated unlocks for recap presentation.
type AchievementGroup struct {
	ViewerDisplayName string `json:"viewer_display_name"`
	ViewerPortraitURL string `json:"viewer_portrait_url,omitempty"`
	AchievementID     string `json:"achievement_id"`
	Revision          int    `json:"revision"`
	Name              string `json:"name"`
	Description       string `json:"description"`
	Count             int    `json:"count"`
	LatestUnlockedAt  string `json:"unlocked_at"`
}

// Snapshot is the version-1 bounded public recap payload shared by storage, HTTP, and WebSocket.
type Snapshot struct {
	Version           int                `json:"version"`
	ID                string             `json:"id"`
	SessionID         string             `json:"session_id"`
	StartedAt         string             `json:"started_at"`
	CapturedAt        string             `json:"captured_at"`
	Totals            Totals             `json:"totals"`
	Ranking           []RankingEntry     `json:"ranking"`
	AchievementGroups []AchievementGroup `json:"achievement_groups"`
}

// BuildSnapshot constructs a validated version-1 snapshot from normalized session aggregates at capture time.
func BuildSnapshot(sessionID string, startedAt, capturedAt time.Time, input CaptureInput) (*Snapshot, error) {
	sessionID = strings.TrimSpace(sessionID)
	if sessionID == "" {
		return nil, ErrInvalidSnapshot
	}

	snapshot := &Snapshot{
		Version:    Version,
		ID:         uuid.NewString(),
		SessionID:  sessionID,
		StartedAt:  formatRFC3339(startedAt),
		CapturedAt: formatRFC3339(capturedAt),
		Totals: Totals{
			ViewerCount:  input.Totals.ViewerCount,
			MessageCount: input.Totals.MessageCount,
			XP:           input.Totals.XP,
		},
		Ranking:           make([]RankingEntry, 0, len(input.Ranking)),
		AchievementGroups: make([]AchievementGroup, 0, len(input.AchievementGroups)),
	}

	for _, entry := range input.Ranking {
		snapshot.Ranking = append(snapshot.Ranking, RankingEntry(entry))
	}
	for _, group := range input.AchievementGroups {
		snapshot.AchievementGroups = append(snapshot.AchievementGroups, AchievementGroup{
			ViewerDisplayName: group.ViewerDisplayName,
			ViewerPortraitURL: group.ViewerPortraitURL,
			AchievementID:     group.AchievementID,
			Revision:          group.Revision,
			Name:              group.Name,
			Description:       group.Description,
			Count:             group.Count,
			LatestUnlockedAt:  formatRFC3339(group.LatestUnlockedAt),
		})
	}

	if err := snapshot.Validate(); err != nil {
		return nil, err
	}
	return snapshot, nil
}

// ParsePayload validates and decodes a stored or wire recap payload.
func ParsePayload(raw string) (*Snapshot, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, ErrInvalidSnapshot
	}
	var snapshot Snapshot
	if err := json.Unmarshal([]byte(raw), &snapshot); err != nil {
		return nil, errors.Errorf("%w: decode payload: %v", ErrInvalidSnapshot, err)
	}
	if err := snapshot.Validate(); err != nil {
		return nil, err
	}
	return &snapshot, nil
}

// EncodePayload returns the canonical JSON bytes for durable storage.
func (s *Snapshot) EncodePayload() (string, error) {
	if err := s.Validate(); err != nil {
		return "", err
	}
	data, err := json.Marshal(s)
	if err != nil {
		return "", errors.Errorf("marshal stream recap snapshot: %w", err)
	}
	return string(data), nil
}

// Validate checks version, identity, timestamps, counts, bounds, and portrait URLs.
func (s *Snapshot) Validate() error {
	if s == nil {
		return ErrInvalidSnapshot
	}
	if s.Version != Version {
		return ErrInvalidSnapshot
	}
	if err := validateIdentity("id", s.ID); err != nil {
		return err
	}
	if err := validateIdentity("session_id", s.SessionID); err != nil {
		return err
	}
	if err := validateTimestamp("started_at", s.StartedAt); err != nil {
		return err
	}
	if err := validateTimestamp("captured_at", s.CapturedAt); err != nil {
		return err
	}
	if s.Totals.ViewerCount < 0 || s.Totals.MessageCount < 0 || s.Totals.XP < 0 {
		return ErrInvalidSnapshot
	}
	if len(s.Ranking) > maxRankingRows {
		return ErrInvalidSnapshot
	}
	for i, entry := range s.Ranking {
		if entry.Rank != i+1 {
			return ErrInvalidSnapshot
		}
		if entry.XP < 0 || entry.MessageCount < 0 {
			return ErrInvalidSnapshot
		}
		if err := validateDisplayName(entry.DisplayName); err != nil {
			return err
		}
		if err := validateOptionalTitle(entry.Title); err != nil {
			return err
		}
		if err := validatePortraitURL(entry.PortraitURL); err != nil {
			return err
		}
	}
	if len(s.AchievementGroups) > maxAchievementGroups {
		return ErrInvalidSnapshot
	}
	for _, group := range s.AchievementGroups {
		if group.Count < 1 {
			return ErrInvalidSnapshot
		}
		if err := validateIdentity("achievement_id", group.AchievementID); err != nil {
			return err
		}
		if group.Revision < 1 {
			return ErrInvalidSnapshot
		}
		if err := validateDisplayName(group.ViewerDisplayName); err != nil {
			return err
		}
		if err := validateName(group.Name); err != nil {
			return err
		}
		if err := validateDescription(group.Description); err != nil {
			return err
		}
		if err := validatePortraitURL(group.ViewerPortraitURL); err != nil {
			return err
		}
		if err := validateTimestamp("unlocked_at", group.LatestUnlockedAt); err != nil {
			return err
		}
	}
	return nil
}

func validateIdentity(field, value string) error {
	value = strings.TrimSpace(value)
	if value == "" || len(value) > maxIdentityLen {
		return ErrInvalidSnapshot
	}
	return nil
}

func validateDisplayName(value string) error {
	value = strings.TrimSpace(value)
	if value == "" || utf8.RuneCountInString(value) > maxDisplayNameRunes {
		return ErrInvalidSnapshot
	}
	return nil
}

func validateName(value string) error {
	value = strings.TrimSpace(value)
	if value == "" || utf8.RuneCountInString(value) > maxDisplayNameRunes {
		return ErrInvalidSnapshot
	}
	return nil
}

func validateOptionalTitle(value string) error {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	if utf8.RuneCountInString(value) > maxTitleRunes {
		return ErrInvalidSnapshot
	}
	return nil
}

func validateDescription(value string) error {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	if utf8.RuneCountInString(value) > maxDescriptionRunes {
		return ErrInvalidSnapshot
	}
	return nil
}

func validateTimestamp(field, value string) error {
	value = strings.TrimSpace(value)
	if value == "" {
		return ErrInvalidSnapshot
	}
	parsed, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		return ErrInvalidSnapshot
	}
	if formatRFC3339(parsed) != value {
		return ErrInvalidSnapshot
	}
	return nil
}

func validatePortraitURL(raw string) error {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	if strings.HasPrefix(raw, overlayAssetURLPrefix) {
		name := strings.TrimPrefix(raw, overlayAssetURLPrefix)
		if name == "" || !config.ValidOverlayAssetName(name) {
			return ErrInvalidSnapshot
		}
		return nil
	}
	if !strings.HasPrefix(raw, "http://") && !strings.HasPrefix(raw, "https://") {
		return ErrInvalidSnapshot
	}
	if _, err := url.Parse(raw); err != nil {
		return ErrInvalidSnapshot
	}
	return nil
}

func formatRFC3339(value time.Time) string {
	return value.UTC().Format(time.RFC3339Nano)
}
