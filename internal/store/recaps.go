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

	if s.db == nil {
		return nil, ErrStoreUnavailable
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, errors.Errorf("begin stream recap capture: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	currentSessionID, err := s.openSessionContextQuerierLocked(ctx, tx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrRecapSessionConflict
	}
	if err != nil {
		return nil, errors.Errorf("lookup current session: %w", err)
	}
	if currentSessionID != expectedSessionID {
		return nil, ErrRecapSessionConflict
	}

	if existing, loadErr := s.loadStreamRecapQuerierLocked(ctx, tx, expectedSessionID); loadErr == nil {
		return existing, nil
	} else if !errors.Is(loadErr, ErrRecapNotFound) {
		return nil, loadErr
	}

	capturedAt := time.Now().UTC()
	snapshot, err := s.buildStreamRecapSnapshotQuerierLocked(ctx, tx, expectedSessionID, customAvatarsEnabled, capturedAt)
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
	if s.recapCaptureHook != nil {
		s.recapCaptureHook()
	}
	if ctxErr := ctx.Err(); ctxErr != nil {
		return nil, errors.Errorf("capture stream recap: %w", ctxErr)
	}
	_, err = tx.ExecContext(ctx,
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
			if rollbackErr := tx.Rollback(); rollbackErr != nil && !errors.Is(rollbackErr, sql.ErrTxDone) {
				return nil, errors.Errorf("rollback stream recap capture: %w", rollbackErr)
			}
			return s.loadStreamRecapLocked(expectedSessionID)
		}
		return nil, errors.Errorf("insert stream recap: %w", err)
	}
	if ctxErr := ctx.Err(); ctxErr != nil {
		return nil, errors.Errorf("capture stream recap: %w", ctxErr)
	}
	if err := tx.Commit(); err != nil {
		return nil, errors.Errorf("commit stream recap capture: %w", err)
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
	if s.db == nil {
		return nil, ErrStoreUnavailable
	}
	return s.loadStreamRecapLocked(sessionID)
}

func (s *Store) loadStreamRecapLocked(sessionID string) (*recap.Snapshot, error) {
	return s.loadStreamRecapQuerierLocked(context.Background(), s.db, sessionID)
}

func (s *Store) loadStreamRecapQuerierLocked(ctx context.Context, q contextRowQuerier, sessionID string) (*recap.Snapshot, error) {
	var payloadJSON string
	err := q.QueryRowContext(ctx, `SELECT payload_json FROM stream_recaps WHERE session_id = ?`, sessionID).Scan(&payloadJSON)
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

func (s *Store) buildStreamRecapSnapshotQuerierLocked(ctx context.Context, q contextRowsQuerier, sessionID string, customAvatarsEnabled bool, capturedAt time.Time) (*recap.Snapshot, error) {
	var startedAtRaw string
	err := q.QueryRowContext(ctx, `SELECT started_at FROM stream_sessions WHERE id = ?`, sessionID).Scan(&startedAtRaw)
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

	totals, err := s.sessionTotalsQuerierLocked(ctx, q, sessionID)
	if err != nil {
		return nil, err
	}
	ranking, err := s.sessionRankingQuerierLocked(ctx, q, sessionID, customAvatarsEnabled)
	if err != nil {
		return nil, err
	}
	groups, err := s.sessionAchievementGroupsQuerierLocked(ctx, q, sessionID, customAvatarsEnabled)
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

// ComputeAllTimeRecapPresentation derives bounded all-time recap status without persisting it.
func (s *Store) ComputeAllTimeRecapPresentation(customAvatarsEnabled bool) (*recap.Presentation, error) {
	viewerCount, messageCount, xp, err := s.allTimeRecapTotals()
	if err != nil {
		return nil, err
	}

	entries, err := s.Leaderboard("all", defaultLeaderboardLimit, 0, time.Now().UTC(), customAvatarsEnabled)
	if err != nil {
		return nil, errors.Errorf("all-time recap ranking: %w", err)
	}

	ranking := make([]recap.RankingEntry, 0, len(entries))
	for _, entry := range entries {
		title := ""
		if entry.Level != nil {
			title = entry.Level.Title
		}
		ranking = append(ranking, recap.RankingEntry{
			Rank:         entry.Rank,
			DisplayName:  entry.DisplayName,
			PortraitURL:  entry.AvatarURL,
			XP:           entry.XP,
			MessageCount: entry.MessageCount,
			Title:        title,
		})
	}

	return recap.NewPresentation(time.Now().UTC(), recap.Totals{
		ViewerCount:  viewerCount,
		MessageCount: messageCount,
		XP:           xp,
	}, ranking), nil
}

func (s *Store) allTimeRecapTotals() (viewerCount, messageCount, xp int, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.db == nil {
		return 0, 0, 0, ErrStoreUnavailable
	}
	err = s.db.QueryRow(`
		SELECT COUNT(*)
		FROM viewers v
		WHERE v.hidden = 0
		  AND v.message_count > 0`).Scan(&viewerCount)
	if err != nil {
		return 0, 0, 0, errors.Errorf("count all-time recap viewers: %w", err)
	}
	err = s.db.QueryRow(`
		SELECT
			COALESCE(SUM(v.message_count), 0),
			COALESCE(SUM(v.xp), 0)
		FROM viewers v
		WHERE v.hidden = 0`).Scan(&messageCount, &xp)
	if err != nil {
		return 0, 0, 0, errors.Errorf("sum all-time recap totals: %w", err)
	}
	return viewerCount, messageCount, xp, nil
}

// SetRecapCaptureHookForTest installs a deterministic hook before the recap
// insert. It must be configured before concurrent capture calls.
func (s *Store) SetRecapCaptureHookForTest(hook func()) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.recapCaptureHook = hook
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
