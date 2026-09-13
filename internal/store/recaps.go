package store

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/recap"
)

// CaptureStreamRecap creates or reuses the immutable snapshot for the expected open session.
func (s *Store) CaptureStreamRecap(ctx context.Context, expectedSessionID string, customAvatarsEnabled bool) (*recap.Snapshot, error) {
	expectedSessionID = strings.TrimSpace(expectedSessionID)
	if expectedSessionID == "" {
		return nil, ErrRecapPayloadInvalid
	}
	if err := ctx.Err(); err != nil {
		return nil, errors.Errorf("capture stream recap: %w", err)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	currentSessionID, err := s.openSessionLocked()
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrRecapSessionConflict
	}
	if err != nil {
		return nil, errors.Errorf("lookup current session: %w", err)
	}
	if currentSessionID != expectedSessionID {
		return nil, ErrRecapSessionConflict
	}

	if existing, loadErr := s.loadStreamRecapLocked(expectedSessionID); loadErr == nil {
		return existing, nil
	} else if !errors.Is(loadErr, ErrRecapNotFound) {
		return nil, loadErr
	}

	capturedAt := time.Now().UTC()
	snapshot, err := s.buildStreamRecapSnapshotLocked(expectedSessionID, customAvatarsEnabled, capturedAt)
	if err != nil {
		return nil, err
	}

	if ctxErr := ctx.Err(); ctxErr != nil {
		return nil, errors.Errorf("capture stream recap: %w", ctxErr)
	}

	payloadJSON, err := snapshot.EncodePayload()
	if err != nil {
		return nil, errors.Errorf("%w: capture payload: %w", ErrRecapPayloadInvalid, err)
	}

	capturedAtRaw := formatTime(capturedAt)
	_, err = s.db.Exec(
		`INSERT INTO stream_recaps (id, session_id, schema_version, payload_json, captured_at, created_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		snapshot.ID,
		expectedSessionID,
		recap.Version,
		payloadJSON,
		capturedAtRaw,
		capturedAtRaw,
	)
	if err != nil {
		if isUniqueConstraint(err) {
			return s.loadStreamRecapLocked(expectedSessionID)
		}
		return nil, errors.Errorf("insert stream recap: %w", err)
	}
	return snapshot, nil
}

// LoadStreamRecap returns the stored snapshot for one session when present.
func (s *Store) LoadStreamRecap(sessionID string) (*recap.Snapshot, error) {
	sessionID = strings.TrimSpace(sessionID)
	if sessionID == "" {
		return nil, ErrRecapNotFound
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	return s.loadStreamRecapLocked(sessionID)
}

func (s *Store) loadStreamRecapLocked(sessionID string) (*recap.Snapshot, error) {
	var payloadJSON string
	err := s.db.QueryRow(`SELECT payload_json FROM stream_recaps WHERE session_id = ?`, sessionID).Scan(&payloadJSON)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrRecapNotFound
	}
	if err != nil {
		return nil, errors.Errorf("load stream recap: %w", err)
	}
	snapshot, err := recap.ParsePayload(payloadJSON)
	if err != nil {
		return nil, errors.Errorf("%w: load payload: %w", ErrRecapPayloadInvalid, err)
	}
	return snapshot, nil
}

func (s *Store) buildStreamRecapSnapshotLocked(sessionID string, customAvatarsEnabled bool, capturedAt time.Time) (*recap.Snapshot, error) {
	var startedAtRaw string
	err := s.db.QueryRow(`SELECT started_at FROM stream_sessions WHERE id = ?`, sessionID).Scan(&startedAtRaw)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrRecapSessionConflict
	}
	if err != nil {
		return nil, errors.Errorf("load session for recap capture: %w", err)
	}
	startedAt, err := parseTime(startedAtRaw)
	if err != nil {
		return nil, err
	}

	totals, err := s.sessionTotalsLocked(sessionID)
	if err != nil {
		return nil, err
	}
	ranking, err := s.sessionRankingLocked(sessionID, customAvatarsEnabled)
	if err != nil {
		return nil, err
	}
	groups, err := s.sessionAchievementGroupsLocked(sessionID, customAvatarsEnabled)
	if err != nil {
		return nil, err
	}

	detail := &SessionDetail{
		ID:                sessionID,
		StartedAt:         startedAt,
		Totals:            totals,
		Ranking:           ranking,
		AchievementGroups: groups,
	}
	return recapBuildSnapshot(sessionID, startedAt, capturedAt, detail)
}

func recapBuildSnapshot(sessionID string, startedAt, capturedAt time.Time, detail *SessionDetail) (*recap.Snapshot, error) {
	input := recap.CaptureInput{
		Totals: recap.Totals{
			ViewerCount:  detail.Totals.ViewerCount,
			MessageCount: detail.Totals.MessageCount,
			XP:           detail.Totals.XP,
		},
		Ranking:           make([]recap.CaptureRankingEntry, 0, len(detail.Ranking)),
		AchievementGroups: make([]recap.CaptureAchievementGroup, 0, len(detail.AchievementGroups)),
	}
	for _, entry := range detail.Ranking {
		input.Ranking = append(input.Ranking, recap.CaptureRankingEntry{
			Rank:         entry.Rank,
			DisplayName:  entry.DisplayName,
			PortraitURL:  entry.PortraitURL,
			XP:           entry.XP,
			MessageCount: entry.MessageCount,
			Title:        entry.Title,
		})
	}
	for _, group := range detail.AchievementGroups {
		input.AchievementGroups = append(input.AchievementGroups, recap.CaptureAchievementGroup{
			ViewerDisplayName: group.ViewerDisplayName,
			ViewerPortraitURL: group.ViewerPortraitURL,
			AchievementID:     group.AchievementID,
			Revision:          group.Revision,
			Name:              group.Name,
			Description:       group.Description,
			Count:             group.Count,
			LatestUnlockedAt:  group.LatestUnlockedAt,
		})
	}
	return recap.BuildSnapshot(sessionID, startedAt, capturedAt, input)
}
