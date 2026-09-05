package store

import (
	"database/sql"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/muonsoft/errors"
)

// ApplyChat upserts the chat identity, increments message counters, and may grant activity XP.
// Empty platform or user_id is ignored without error.
func (s *Store) ApplyChat(identity ChatIdentity, activity ActivitySettings, dayResetHour int, now time.Time) error {
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
		     last_seen_at = ?
		 WHERE id = ?`,
		seenAt,
		viewerID,
	); err != nil {
		return errors.Errorf("increment viewer message count: %w", err)
	}

	if err := s.incrementMessageCountsLocked(tx, viewerID, sessionID, dayKey); err != nil {
		return err
	}

	if activity.Enabled() {
		if err := s.maybeGrantActivityLocked(tx, viewerID, sessionID, dayKey, activity, now); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return errors.Errorf("commit chat ingest: %w", err)
	}

	return nil
}

func (s *Store) maybeGrantActivityLocked(
	tx *sql.Tx,
	viewerID, sessionID, dayKey string,
	activity ActivitySettings,
	now time.Time,
) error {
	var activityGrants int
	var lastActivityRaw sql.NullString
	err := tx.QueryRow(
		`SELECT activity_grants, last_activity_at
		 FROM viewer_session_stats
		 WHERE viewer_id = ? AND session_id = ?`,
		viewerID,
		sessionID,
	).Scan(&activityGrants, &lastActivityRaw)
	if errors.Is(err, sql.ErrNoRows) {
		return errors.New("session stats missing after message increment")
	}
	if err != nil {
		return errors.Errorf("load session activity counters: %w", err)
	}

	if activityGrants >= activity.SessionLimit {
		return nil
	}

	if lastActivityRaw.Valid && strings.TrimSpace(lastActivityRaw.String) != "" {
		lastActivity, parseErr := parseTime(lastActivityRaw.String)
		if parseErr != nil {
			return parseErr
		}
		if now.Sub(lastActivity) < time.Duration(activity.IntervalSeconds)*time.Second {
			return nil
		}
	}

	if _, err := tx.Exec(
		`UPDATE viewers
		 SET xp = xp + ?
		 WHERE id = ?`,
		activity.XP,
		viewerID,
	); err != nil {
		return errors.Errorf("increment viewer xp: %w", err)
	}

	if err := s.addPeriodXPLocked(tx, viewerID, sessionID, dayKey, activity.XP); err != nil {
		return err
	}

	grantAt := formatTime(now)
	if _, err := tx.Exec(
		`UPDATE viewer_session_stats
		 SET activity_grants = activity_grants + 1,
		     last_activity_at = ?
		 WHERE viewer_id = ? AND session_id = ?`,
		grantAt,
		viewerID,
		sessionID,
	); err != nil {
		return errors.Errorf("update session activity counters: %w", err)
	}

	if err := s.appendInteractionEventLocked(tx, AppendInteractionEventInput{
		Kind:     InteractionEventActivity,
		ViewerID: viewerID,
		Points:   activity.XP,
		Now:      now,
	}); err != nil {
		return err
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
		`INSERT INTO viewers (id, display_name, message_count, xp, last_seen_at, hidden, created_at)
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

func (s *Store) incrementMessageCountsLocked(tx *sql.Tx, viewerID, sessionID, dayKey string) error {
	if _, err := tx.Exec(
		`INSERT INTO viewer_session_stats (viewer_id, session_id, message_count, xp)
		 VALUES (?, ?, 1, 0)
		 ON CONFLICT(viewer_id, session_id) DO UPDATE SET
		   message_count = message_count + 1`,
		viewerID,
		sessionID,
	); err != nil {
		return errors.Errorf("increment session message count: %w", err)
	}

	if _, err := tx.Exec(
		`INSERT INTO viewer_day_stats (viewer_id, day_key, message_count, xp)
		 VALUES (?, ?, 1, 0)
		 ON CONFLICT(viewer_id, day_key) DO UPDATE SET
		   message_count = message_count + 1`,
		viewerID,
		dayKey,
	); err != nil {
		return errors.Errorf("increment day message count: %w", err)
	}

	return nil
}

func (s *Store) addPeriodXPLocked(tx *sql.Tx, viewerID, sessionID, dayKey string, xp int) error {
	if _, err := tx.Exec(
		`INSERT INTO viewer_session_stats (viewer_id, session_id, message_count, xp)
		 VALUES (?, ?, 0, ?)
		 ON CONFLICT(viewer_id, session_id) DO UPDATE SET
		   xp = xp + excluded.xp`,
		viewerID,
		sessionID,
		xp,
	); err != nil {
		return errors.Errorf("increment session xp: %w", err)
	}

	if _, err := tx.Exec(
		`INSERT INTO viewer_day_stats (viewer_id, day_key, message_count, xp)
		 VALUES (?, ?, 0, ?)
		 ON CONFLICT(viewer_id, day_key) DO UPDATE SET
		   xp = xp + excluded.xp`,
		viewerID,
		dayKey,
		xp,
	); err != nil {
		return errors.Errorf("increment day xp: %w", err)
	}

	return nil
}
