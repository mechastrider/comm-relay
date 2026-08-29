package store

import (
	"database/sql"
	"strings"
	"time"

	"github.com/muonsoft/errors"
)

const defaultLeaderboardLimit = 20

// LeaderboardEntry is one ranked row for a leaderboard period.
type LeaderboardEntry struct {
	Rank         int
	DisplayName  string
	AvatarURL    string
	Score        int
	MessageCount int
}

// Leaderboard returns ranked visible viewers for the requested period.
// period must be session, day, or all; invalid values use session.
func (s *Store) Leaderboard(period string, limit int, dayResetHour int, now time.Time) ([]LeaderboardEntry, error) {
	period = normalizeLeaderboardPeriod(period)
	if limit <= 0 {
		limit = defaultLeaderboardLimit
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if s.db == nil {
		return nil, errors.New("store closed")
	}

	sessionID, err := s.openSessionLocked()
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, errors.Errorf("lookup open session: %w", err)
	}

	dayKey := DayKey(now, dayResetHour)

	var query string
	var args []any

	switch period {
	case "day":
		query = leaderboardDayQuery
		args = []any{dayKey, limit}
	case "all":
		query = leaderboardAllQuery
		args = []any{limit}
	default:
		query = leaderboardSessionQuery
		args = []any{sessionID, limit}
	}

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, errors.Errorf("leaderboard %s: %w", period, err)
	}
	defer func() { _ = rows.Close() }()

	var entries []LeaderboardEntry
	rank := 0
	for rows.Next() {
		var entry LeaderboardEntry
		if err := rows.Scan(
			&entry.DisplayName,
			&entry.AvatarURL,
			&entry.Score,
			&entry.MessageCount,
		); err != nil {
			return nil, errors.Errorf("scan leaderboard row: %w", err)
		}
		rank++
		entry.Rank = rank
		entries = append(entries, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.Errorf("iterate leaderboard rows: %w", err)
	}

	return entries, nil
}

func normalizeLeaderboardPeriod(period string) string {
	switch strings.TrimSpace(strings.ToLower(period)) {
	case "day", "all":
		return strings.TrimSpace(strings.ToLower(period))
	case "session":
		return "session"
	default:
		return "session"
	}
}

const effectiveDisplayNameSQL = `
COALESCE(
	NULLIF(v.display_name, ''),
	(
		SELECT vi.display_name FROM viewer_identities vi
		WHERE vi.viewer_id = v.id
		ORDER BY vi.last_seen_at DESC
		LIMIT 1
	),
	(
		SELECT vi.username FROM viewer_identities vi
		WHERE vi.viewer_id = v.id
		ORDER BY vi.last_seen_at DESC
		LIMIT 1
	),
	''
)`

const lastSeenAvatarSQL = `
COALESCE((
	SELECT vi.avatar_url FROM viewer_identities vi
	WHERE vi.viewer_id = v.id
	ORDER BY vi.last_seen_at DESC
	LIMIT 1
), '')`

const leaderboardSessionQuery = `
SELECT
	` + effectiveDisplayNameSQL + `,
	` + lastSeenAvatarSQL + `,
	COALESCE(vss.score, 0),
	COALESCE(vss.message_count, 0)
FROM viewers v
INNER JOIN viewer_session_stats vss ON vss.viewer_id = v.id AND vss.session_id = ?
WHERE v.hidden = 0
  AND (COALESCE(vss.score, 0) > 0 OR COALESCE(vss.message_count, 0) > 0)
ORDER BY COALESCE(vss.score, 0) DESC, COALESCE(vss.message_count, 0) DESC
LIMIT ?`

const leaderboardDayQuery = `
SELECT
	` + effectiveDisplayNameSQL + `,
	` + lastSeenAvatarSQL + `,
	COALESCE(vds.score, 0),
	COALESCE(vds.message_count, 0)
FROM viewers v
INNER JOIN viewer_day_stats vds ON vds.viewer_id = v.id AND vds.day_key = ?
WHERE v.hidden = 0
  AND (COALESCE(vds.score, 0) > 0 OR COALESCE(vds.message_count, 0) > 0)
ORDER BY COALESCE(vds.score, 0) DESC, COALESCE(vds.message_count, 0) DESC
LIMIT ?`

const leaderboardAllQuery = `
SELECT
	` + effectiveDisplayNameSQL + `,
	` + lastSeenAvatarSQL + `,
	v.score,
	v.message_count
FROM viewers v
WHERE v.hidden = 0
  AND (v.score > 0 OR v.message_count > 0)
ORDER BY v.score DESC, v.message_count DESC
LIMIT ?`
