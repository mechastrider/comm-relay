package store

import (
	"database/sql"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/muonsoft/errors"
)

// ApplyChat upserts the chat identity and increments counters for all-time, session, and day.
// Empty platform or user_id is ignored without error.
func (s *Store) ApplyChat(identity ChatIdentity, points int, dayResetHour int, now time.Time) error {
	if strings.TrimSpace(identity.UserID) == "" || strings.TrimSpace(identity.Platform) == "" {
		return nil
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
	seenAt := formatTime(now)

	tx, err := s.db.Begin()
	if err != nil {
		return errors.Errorf("begin transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	viewerID, err := s.upsertIdentityLocked(tx, identity, seenAt, now)
	if err != nil {
		return err
	}

	if _, err := tx.Exec(
		`UPDATE viewers
		 SET message_count = message_count + 1,
		     score = score + ?,
		     last_seen_at = ?
		 WHERE id = ?`,
		points,
		seenAt,
		viewerID,
	); err != nil {
		return errors.Errorf("increment viewer counters: %w", err)
	}

	if err := s.incrementPeriodStatsLocked(tx, viewerID, sessionID, dayKey, points); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return errors.Errorf("commit chat ingest: %w", err)
	}

	return nil
}

func (s *Store) upsertIdentityLocked(tx *sql.Tx, identity ChatIdentity, seenAt string, now time.Time) (string, error) {
	var viewerID string
	err := tx.QueryRow(
		`SELECT viewer_id FROM viewer_identities WHERE platform = ? AND user_id = ?`,
		identity.Platform,
		identity.UserID,
	).Scan(&viewerID)
	if err == nil {
		if _, updateErr := tx.Exec(
			`UPDATE viewer_identities
			 SET username = ?, display_name = ?, avatar_url = ?, last_seen_at = ?
			 WHERE platform = ? AND user_id = ?`,
			identity.Username,
			identity.DisplayName,
			identity.AvatarURL,
			seenAt,
			identity.Platform,
			identity.UserID,
		); updateErr != nil {
			return "", errors.Errorf("update viewer identity: %w", updateErr)
		}

		return viewerID, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return "", errors.Errorf("lookup viewer identity: %w", err)
	}

	viewerID = uuid.NewString()
	createdAt := formatTime(now)
	if _, err := tx.Exec(
		`INSERT INTO viewers (id, display_name, message_count, score, last_seen_at, hidden, created_at)
		 VALUES (?, NULL, 0, 0, ?, 0, ?)`,
		viewerID,
		seenAt,
		createdAt,
	); err != nil {
		return "", errors.Errorf("insert viewer: %w", err)
	}

	if _, err := tx.Exec(
		`INSERT INTO viewer_identities (platform, user_id, viewer_id, username, display_name, avatar_url, last_seen_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		identity.Platform,
		identity.UserID,
		viewerID,
		identity.Username,
		identity.DisplayName,
		identity.AvatarURL,
		seenAt,
	); err != nil {
		return "", errors.Errorf("insert viewer identity: %w", err)
	}

	return viewerID, nil
}

func (s *Store) incrementPeriodStatsLocked(tx *sql.Tx, viewerID, sessionID, dayKey string, points int) error {
	if _, err := tx.Exec(
		`INSERT INTO viewer_session_stats (viewer_id, session_id, message_count, score)
		 VALUES (?, ?, 1, ?)
		 ON CONFLICT(viewer_id, session_id) DO UPDATE SET
		   message_count = message_count + 1,
		   score = score + excluded.score`,
		viewerID,
		sessionID,
		points,
	); err != nil {
		return errors.Errorf("increment session stats: %w", err)
	}

	if _, err := tx.Exec(
		`INSERT INTO viewer_day_stats (viewer_id, day_key, message_count, score)
		 VALUES (?, ?, 1, ?)
		 ON CONFLICT(viewer_id, day_key) DO UPDATE SET
		   message_count = message_count + 1,
		   score = score + excluded.score`,
		viewerID,
		dayKey,
		points,
	); err != nil {
		return errors.Errorf("increment day stats: %w", err)
	}

	return nil
}
