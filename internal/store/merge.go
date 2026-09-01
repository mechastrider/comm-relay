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
	var messageCount, score int
	err := tx.QueryRow(
		`SELECT message_count, score FROM viewers WHERE id = ?`,
		fromID,
	).Scan(&messageCount, &score)
	if err != nil {
		return errors.Errorf("load source all-time counters: %w", err)
	}

	if messageCount == 0 && score == 0 {
		return nil
	}

	if _, err := tx.Exec(
		`UPDATE viewers
		 SET message_count = message_count + ?,
		     score = score + ?
		 WHERE id = ?`,
		messageCount,
		score,
		intoID,
	); err != nil {
		return errors.Errorf("sum all-time counters: %w", err)
	}

	return nil
}

func (s *Store) sumSessionCountersLocked(tx *sql.Tx, fromID, intoID, sessionID string) error {
	var messageCount, score int
	err := tx.QueryRow(
		`SELECT message_count, score FROM viewer_session_stats WHERE viewer_id = ? AND session_id = ?`,
		fromID,
		sessionID,
	).Scan(&messageCount, &score)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return errors.Errorf("load source session counters: %w", err)
	}

	if _, err := tx.Exec(
		`INSERT INTO viewer_session_stats (viewer_id, session_id, message_count, score)
		 VALUES (?, ?, ?, ?)
		 ON CONFLICT(viewer_id, session_id) DO UPDATE SET
		   message_count = message_count + excluded.message_count,
		   score = score + excluded.score`,
		intoID,
		sessionID,
		messageCount,
		score,
	); err != nil {
		return errors.Errorf("sum session counters: %w", err)
	}

	return nil
}

func (s *Store) sumDayCountersLocked(tx *sql.Tx, fromID, intoID, dayKey string) error {
	var messageCount, score int
	err := tx.QueryRow(
		`SELECT message_count, score FROM viewer_day_stats WHERE viewer_id = ? AND day_key = ?`,
		fromID,
		dayKey,
	).Scan(&messageCount, &score)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return errors.Errorf("load source day counters: %w", err)
	}

	if _, err := tx.Exec(
		`INSERT INTO viewer_day_stats (viewer_id, day_key, message_count, score)
		 VALUES (?, ?, ?, ?)
		 ON CONFLICT(viewer_id, day_key) DO UPDATE SET
		   message_count = message_count + excluded.message_count,
		   score = score + excluded.score`,
		intoID,
		dayKey,
		messageCount,
		score,
	); err != nil {
		return errors.Errorf("sum day counters: %w", err)
	}

	return nil
}
