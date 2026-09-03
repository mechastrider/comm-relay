package store

import (
	"database/sql"
	"time"

	"github.com/muonsoft/errors"
)

// Merge moves identities and counters from fromID onto intoID and hides the source viewer.
func (s *Store) Merge(fromID, intoID string, dayResetHour int, now time.Time) error {
	if fromID == intoID {
		return ErrSelfMerge
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if err := s.ensureOpenSessionLocked(now); err != nil {
		return errors.Errorf("ensure open session: %w", err)
	}

	sessionID, err := s.openSessionLocked()
	if err != nil {
		return errors.Errorf("lookup open session: %w", err)
	}

	dayKey := DayKey(now, dayResetHour)

	tx, err := s.db.Begin()
	if err != nil {
		return errors.Errorf("begin transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	if err := loadVisibleViewer(tx, fromID); err != nil {
		return err
	}
	if err := loadVisibleViewer(tx, intoID); err != nil {
		return err
	}

	if err := s.repointIdentitiesLocked(tx, fromID, intoID); err != nil {
		return err
	}
	if err := s.sumAllTimeCountersLocked(tx, fromID, intoID); err != nil {
		return err
	}
	if err := s.sumSessionCountersLocked(tx, fromID, intoID, sessionID); err != nil {
		return err
	}
	if err := s.sumDayCountersLocked(tx, fromID, intoID, dayKey); err != nil {
		return err
	}

	mergedAt := formatTime(now)
	if _, err := tx.Exec(
		`INSERT INTO viewer_merges (from_id, into_id, merged_at) VALUES (?, ?, ?)`,
		fromID,
		intoID,
		mergedAt,
	); err != nil {
		return errors.Errorf("insert merge audit: %w", err)
	}

	if _, err := tx.Exec(`UPDATE viewers SET hidden = 1 WHERE id = ?`, fromID); err != nil {
		return errors.Errorf("hide merged source viewer: %w", err)
	}

	if err := s.rewriteInteractionEventsLocked(tx, fromID, intoID); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return errors.Errorf("commit merge: %w", err)
	}

	return nil
}

func (s *Store) repointIdentitiesLocked(tx *sql.Tx, fromID, intoID string) error {
	if _, err := tx.Exec(`UPDATE viewer_identities SET viewer_id = ? WHERE viewer_id = ?`, intoID, fromID); err != nil {
		return errors.Errorf("repoint identities: %w", err)
	}

	return nil
}

func (s *Store) sumAllTimeCountersLocked(tx *sql.Tx, fromID, intoID string) error {
	var messageCount, xp int
	err := tx.QueryRow(
		`SELECT message_count, xp FROM viewers WHERE id = ?`,
		fromID,
	).Scan(&messageCount, &xp)
	if err != nil {
		return errors.Errorf("load source all-time counters: %w", err)
	}

	if messageCount == 0 && xp == 0 {
		return nil
	}

	if _, err := tx.Exec(
		`UPDATE viewers
		 SET message_count = message_count + ?,
		     xp = xp + ?
		 WHERE id = ?`,
		messageCount,
		xp,
		intoID,
	); err != nil {
		return errors.Errorf("sum all-time counters: %w", err)
	}

	return nil
}

func (s *Store) sumSessionCountersLocked(tx *sql.Tx, fromID, intoID, sessionID string) error {
	var messageCount, xp, activityGrants int
	var lastActivityAt sql.NullString
	err := tx.QueryRow(
		`SELECT message_count, xp, activity_grants, last_activity_at
		 FROM viewer_session_stats WHERE viewer_id = ? AND session_id = ?`,
		fromID,
		sessionID,
	).Scan(&messageCount, &xp, &activityGrants, &lastActivityAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return errors.Errorf("load source session counters: %w", err)
	}

	if _, err := tx.Exec(
		`INSERT INTO viewer_session_stats (viewer_id, session_id, message_count, xp, activity_grants, last_activity_at)
		 VALUES (?, ?, ?, ?, ?, ?)
		 ON CONFLICT(viewer_id, session_id) DO UPDATE SET
		   message_count = message_count + excluded.message_count,
		   xp = xp + excluded.xp,
		   activity_grants = activity_grants + excluded.activity_grants,
		   last_activity_at = CASE
		     WHEN excluded.last_activity_at IS NULL THEN last_activity_at
		     WHEN last_activity_at IS NULL THEN excluded.last_activity_at
		     WHEN excluded.last_activity_at > last_activity_at THEN excluded.last_activity_at
		     ELSE last_activity_at
		   END`,
		intoID,
		sessionID,
		messageCount,
		xp,
		activityGrants,
		lastActivityAt,
	); err != nil {
		return errors.Errorf("sum session counters: %w", err)
	}

	return nil
}

func (s *Store) sumDayCountersLocked(tx *sql.Tx, fromID, intoID, dayKey string) error {
	var messageCount, xp int
	err := tx.QueryRow(
		`SELECT message_count, xp FROM viewer_day_stats WHERE viewer_id = ? AND day_key = ?`,
		fromID,
		dayKey,
	).Scan(&messageCount, &xp)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return errors.Errorf("load source day counters: %w", err)
	}

	if _, err := tx.Exec(
		`INSERT INTO viewer_day_stats (viewer_id, day_key, message_count, xp)
		 VALUES (?, ?, ?, ?)
		 ON CONFLICT(viewer_id, day_key) DO UPDATE SET
		   message_count = message_count + excluded.message_count,
		   xp = xp + excluded.xp`,
		intoID,
		dayKey,
		messageCount,
		xp,
	); err != nil {
		return errors.Errorf("sum day counters: %w", err)
	}

	return nil
}
