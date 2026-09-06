package store

import (
	"database/sql"

	"github.com/muonsoft/errors"
)

type topThreeSnapshot struct {
	Session []string
	Day     []string
	All     []string
}

func captureTopThree(tx *sql.Tx, sessionID, dayKey string) (topThreeSnapshot, error) {
	session, err := queryTopThree(tx, `
		SELECT v.id
		FROM viewers v
		INNER JOIN viewer_session_stats vss ON vss.viewer_id = v.id AND vss.session_id = ?
		WHERE v.hidden = 0 AND v.leaderboard_hidden = 0
		  AND (COALESCE(vss.xp, 0) > 0 OR COALESCE(vss.message_count, 0) > 0)
		ORDER BY COALESCE(vss.xp, 0) DESC, COALESCE(vss.message_count, 0) DESC
		LIMIT 3`, sessionID)
	if err != nil {
		return topThreeSnapshot{}, errors.Errorf("capture session top three: %w", err)
	}
	day, err := queryTopThree(tx, `
		SELECT v.id
		FROM viewers v
		INNER JOIN viewer_day_stats vds ON vds.viewer_id = v.id AND vds.day_key = ?
		WHERE v.hidden = 0 AND v.leaderboard_hidden = 0
		  AND (COALESCE(vds.xp, 0) > 0 OR COALESCE(vds.message_count, 0) > 0)
		ORDER BY COALESCE(vds.xp, 0) DESC, COALESCE(vds.message_count, 0) DESC
		LIMIT 3`, dayKey)
	if err != nil {
		return topThreeSnapshot{}, errors.Errorf("capture day top three: %w", err)
	}
	all, err := queryTopThree(tx, `
		SELECT v.id
		FROM viewers v
		WHERE v.hidden = 0 AND v.leaderboard_hidden = 0
		  AND (v.xp > 0 OR v.message_count > 0)
		ORDER BY v.xp DESC, v.message_count DESC
		LIMIT 3`)
	if err != nil {
		return topThreeSnapshot{}, errors.Errorf("capture all-time top three: %w", err)
	}
	return topThreeSnapshot{Session: session, Day: day, All: all}, nil
}

func queryTopThree(tx *sql.Tx, query string, args ...any) ([]string, error) {
	rows, err := tx.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return ids, nil
}

func topThreeChanged(before, after topThreeSnapshot) bool {
	return orderedIDsChanged(before.Session, after.Session) ||
		orderedIDsChanged(before.Day, after.Day) ||
		orderedIDsChanged(before.All, after.All)
}

func orderedIDsChanged(before, after []string) bool {
	if len(before) != len(after) {
		return true
	}
	for index := range before {
		if before[index] != after[index] {
			return true
		}
	}
	return false
}
