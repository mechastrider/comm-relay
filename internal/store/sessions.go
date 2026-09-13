package store

import (
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"strings"
	"time"

	"github.com/muonsoft/errors"
)

const (
	defaultSessionListLimit = 20
	maxSessionListLimit     = 50
	maxSessionCursorLen     = 1024
)

type sessionCursor struct {
	Version   int    `json:"v"`
	StartedAt string `json:"started_at"`
	ID        string `json:"id"`
}

// ListSessions returns a bounded newest-first page of stream session summaries.
func (s *Store) ListSessions(query SessionsQuery) (SessionsPage, error) {
	limit, err := sessionListLimit(query.Limit)
	if err != nil {
		return SessionsPage{}, err
	}
	cursor, err := decodeSessionCursor(query.Cursor)
	if err != nil {
		return SessionsPage{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	currentSessionID, currentErr := s.openSessionLocked()
	if currentErr != nil && !errors.Is(currentErr, sql.ErrNoRows) {
		return SessionsPage{}, errors.Errorf("lookup current session: %w", currentErr)
	}
	if errors.Is(currentErr, sql.ErrNoRows) {
		currentSessionID = ""
	}

	args := []any{}
	where := ""
	if cursor != nil {
		where = `WHERE (ss.started_at < ? OR (ss.started_at = ? AND ss.id < ?))`
		args = append(args, cursor.StartedAt, cursor.StartedAt, cursor.ID)
	}
	args = append(args, limit+1)

	rows, err := s.db.Query(`
		SELECT ss.id, ss.started_at, ss.ended_at,
		       EXISTS(SELECT 1 FROM stream_recaps sr WHERE sr.session_id = ss.id)
		FROM stream_sessions ss
		`+where+`
		ORDER BY ss.started_at DESC, ss.id DESC
		LIMIT ?`, args...)
	if err != nil {
		return SessionsPage{}, errors.Errorf("list sessions: %w", err)
	}
	defer func() { _ = rows.Close() }()

	summaries := make([]SessionSummary, 0, limit+1)
	for rows.Next() {
		summary, scanErr := scanSessionSummaryRow(rows, currentSessionID)
		if scanErr != nil {
			return SessionsPage{}, scanErr
		}
		summaries = append(summaries, summary)
	}
	if closeErr := rows.Close(); closeErr != nil {
		return SessionsPage{}, errors.Errorf("close session list rows: %w", closeErr)
	}
	if rowsErr := rows.Err(); rowsErr != nil {
		return SessionsPage{}, errors.Errorf("iterate sessions: %w", rowsErr)
	}
	for i := range summaries {
		totals, totalsErr := s.sessionTotalsLocked(summaries[i].ID)
		if totalsErr != nil {
			return SessionsPage{}, totalsErr
		}
		summaries[i].Totals = totals
	}

	page := SessionsPage{Sessions: summaries}
	if len(summaries) <= limit {
		return page, nil
	}

	summaries = summaries[:limit]
	page.Sessions = summaries
	page.NextCursor, err = encodeSessionCursor(summaries[len(summaries)-1])
	if err != nil {
		return SessionsPage{}, err
	}
	return page, nil
}

// GetSession returns bounded detail for one selected session id.
func (s *Store) GetSession(sessionID string, customAvatarsEnabled bool) (*SessionDetail, error) {
	sessionID = strings.TrimSpace(sessionID)
	if sessionID == "" {
		return nil, ErrSessionNotFound
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	currentSessionID, currentErr := s.openSessionLocked()
	if currentErr != nil && !errors.Is(currentErr, sql.ErrNoRows) {
		return nil, errors.Errorf("lookup current session: %w", currentErr)
	}
	if errors.Is(currentErr, sql.ErrNoRows) {
		currentSessionID = ""
	}

	var startedAtRaw string
	var endedAtRaw sql.NullString
	var hasRecap bool
	err := s.db.QueryRow(`
		SELECT ss.started_at, ss.ended_at,
		       EXISTS(SELECT 1 FROM stream_recaps sr WHERE sr.session_id = ss.id)
		FROM stream_sessions ss
		WHERE ss.id = ?`, sessionID).Scan(&startedAtRaw, &endedAtRaw, &hasRecap)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrSessionNotFound
	}
	if err != nil {
		return nil, errors.Errorf("load session: %w", err)
	}

	startedAt, err := parseTime(startedAtRaw)
	if err != nil {
		return nil, err
	}
	var endedAt *time.Time
	if endedAtRaw.Valid && strings.TrimSpace(endedAtRaw.String) != "" {
		parsed, parseErr := parseTime(endedAtRaw.String)
		if parseErr != nil {
			return nil, parseErr
		}
		endedAt = &parsed
	}

	totals, err := s.sessionTotalsLocked(sessionID)
	if err != nil {
		return nil, err
	}

	detail := &SessionDetail{
		ID:        sessionID,
		StartedAt: startedAt,
		EndedAt:   endedAt,
		IsCurrent: sessionID == currentSessionID,
		HasRecap:  hasRecap,
		Totals:    totals,
	}

	if hasRecap {
		var capturedAtRaw, payloadJSON string
		err = s.db.QueryRow(`SELECT captured_at, payload_json FROM stream_recaps WHERE session_id = ?`, sessionID).Scan(&capturedAtRaw, &payloadJSON)
		if err != nil {
			return nil, errors.Errorf("load session recap: %w", err)
		}
		capturedAt, parseErr := parseTime(capturedAtRaw)
		if parseErr != nil {
			return nil, parseErr
		}
		detail.RecapCapturedAt = &capturedAt
		detail.RecapPayloadJSON = payloadJSON
	}

	ranking, err := s.sessionRankingLocked(sessionID, customAvatarsEnabled)
	if err != nil {
		return nil, err
	}
	detail.Ranking = ranking

	groups, err := s.sessionAchievementGroupsLocked(sessionID, customAvatarsEnabled)
	if err != nil {
		return nil, err
	}
	detail.AchievementGroups = groups

	return detail, nil
}

func scanSessionSummaryRow(rows *sql.Rows, currentSessionID string) (SessionSummary, error) {
	var summary SessionSummary
	var startedAtRaw string
	var endedAtRaw sql.NullString
	if err := rows.Scan(&summary.ID, &startedAtRaw, &endedAtRaw, &summary.HasRecap); err != nil {
		return SessionSummary{}, errors.Errorf("scan session summary: %w", err)
	}
	startedAt, err := parseTime(startedAtRaw)
	if err != nil {
		return SessionSummary{}, err
	}
	summary.StartedAt = startedAt
	if endedAtRaw.Valid && strings.TrimSpace(endedAtRaw.String) != "" {
		parsed, parseErr := parseTime(endedAtRaw.String)
		if parseErr != nil {
			return SessionSummary{}, parseErr
		}
		summary.EndedAt = &parsed
	}
	summary.IsCurrent = summary.ID == currentSessionID
	return summary, nil
}

func (s *Store) sessionTotalsLocked(sessionID string) (SessionTotals, error) {
	var totals SessionTotals
	err := s.db.QueryRow(`
		SELECT
			COALESCE(SUM(CASE WHEN COALESCE(vss.xp, 0) > 0 OR COALESCE(vss.message_count, 0) > 0 THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(COALESCE(vss.message_count, 0)), 0),
			COALESCE(SUM(COALESCE(vss.xp, 0)), 0)
		FROM viewer_session_stats vss
		WHERE vss.session_id = ?`, sessionID).Scan(&totals.ViewerCount, &totals.MessageCount, &totals.XP)
	if err != nil {
		return SessionTotals{}, errors.Errorf("aggregate session totals: %w", err)
	}
	return totals, nil
}

func (s *Store) sessionRankingLocked(sessionID string, customAvatarsEnabled bool) ([]SessionRankingEntry, error) {
	levels, err := progressionLevelsForLeaderboard(s.db)
	if err != nil {
		return nil, err
	}

	rows, err := s.db.Query(leaderboardSessionQuery, sessionID, 5)
	if err != nil {
		return nil, errors.Errorf("load session ranking: %w", err)
	}
	defer func() { _ = rows.Close() }()

	entries := make([]SessionRankingEntry, 0, 5)
	rank := 0
	for rows.Next() {
		var entry SessionRankingEntry
		var customAvatar, platformAvatar string
		if err := rows.Scan(&entry.DisplayName, &customAvatar, &platformAvatar, &entry.XP, &entry.MessageCount); err != nil {
			return nil, errors.Errorf("scan session ranking row: %w", err)
		}
		resolved := ResolvePortraitURL(PortraitFields{CustomAvatar: customAvatar}, customAvatarsEnabled)
		if resolved != "" {
			entry.PortraitURL = resolved
		} else {
			entry.PortraitURL = platformAvatar
		}
		rank++
		entry.Rank = rank
		if level := resolvedLeaderboardLevel(levels, entry.XP); level != nil {
			entry.Title = level.Title
		}
		entries = append(entries, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.Errorf("iterate session ranking rows: %w", err)
	}
	return entries, nil
}

func (s *Store) sessionAchievementGroupsLocked(sessionID string, customAvatarsEnabled bool) ([]SessionAchievementGroup, error) {
	rows, err := s.db.Query(`
		SELECT
			vau.viewer_id,
			`+effectiveDisplayNameSQL+`,
			TRIM(v.custom_avatar),
			COALESCE(`+CanonicalViewerPortraitSQL+`, ''),
			vau.achievement_id,
			vau.revision,
			MAX(vau.name),
			MAX(vau.description),
			COUNT(*) AS occurrence_count,
			MAX(vau.unlocked_at)
		FROM viewer_achievement_unlocks vau
		JOIN viewers v ON v.id = vau.viewer_id
		JOIN achievement_definitions ad ON ad.id = vau.achievement_id AND ad.deleted_at IS NULL
		WHERE vau.session_id = ?
		  AND vau.backfilled = 0
		  AND v.hidden = 0
		  AND v.progression_alerts_disabled = 0
		  AND ad.announce = 1
		GROUP BY vau.viewer_id, vau.achievement_id, vau.revision
		ORDER BY MAX(vau.unlocked_at) DESC, vau.achievement_id DESC, vau.revision DESC
		LIMIT 6`, sessionID)
	if err != nil {
		return nil, errors.Errorf("load session achievement groups: %w", err)
	}
	defer func() { _ = rows.Close() }()

	groups := make([]SessionAchievementGroup, 0, 6)
	for rows.Next() {
		var viewerID string
		var group SessionAchievementGroup
		var customAvatar, platformAvatar string
		var latestUnlockedRaw string
		if err := rows.Scan(
			&viewerID,
			&group.ViewerDisplayName,
			&customAvatar,
			&platformAvatar,
			&group.AchievementID,
			&group.Revision,
			&group.Name,
			&group.Description,
			&group.Count,
			&latestUnlockedRaw,
		); err != nil {
			return nil, errors.Errorf("scan session achievement group: %w", err)
		}
		resolved := ResolvePortraitURL(PortraitFields{CustomAvatar: customAvatar}, customAvatarsEnabled)
		if resolved != "" {
			group.ViewerPortraitURL = resolved
		} else {
			group.ViewerPortraitURL = platformAvatar
		}
		latestUnlocked, parseErr := parseTime(latestUnlockedRaw)
		if parseErr != nil {
			return nil, parseErr
		}
		group.LatestUnlockedAt = latestUnlocked
		groups = append(groups, group)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.Errorf("iterate session achievement groups: %w", err)
	}
	return groups, nil
}

func sessionListLimit(limit int) (int, error) {
	if limit == 0 {
		return defaultSessionListLimit, nil
	}
	if limit < 1 || limit > maxSessionListLimit {
		return 0, ErrInvalidSessionListLimit
	}
	return limit, nil
}

func encodeSessionCursor(summary SessionSummary) (string, error) {
	payload, err := json.Marshal(sessionCursor{
		Version:   1,
		StartedAt: formatTime(summary.StartedAt),
		ID:        summary.ID,
	})
	if err != nil {
		return "", errors.Errorf("encode session cursor: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(payload), nil
}

func decodeSessionCursor(encoded string) (*sessionCursor, error) {
	encoded = strings.TrimSpace(encoded)
	if encoded == "" {
		return nil, nil
	}
	if len(encoded) > maxSessionCursorLen {
		return nil, ErrInvalidSessionCursor
	}
	payload, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return nil, ErrInvalidSessionCursor
	}
	var cursor sessionCursor
	if unmarshalErr := json.Unmarshal(payload, &cursor); unmarshalErr != nil {
		return nil, ErrInvalidSessionCursor
	}
	if cursor.Version != 1 || strings.TrimSpace(cursor.ID) == "" || len(cursor.ID) > 128 {
		return nil, ErrInvalidSessionCursor
	}
	startedAt, err := time.Parse(time.RFC3339Nano, cursor.StartedAt)
	if err != nil || formatTime(startedAt) != cursor.StartedAt {
		return nil, ErrInvalidSessionCursor
	}
	return &cursor, nil
}
