package store

import (
	"database/sql"
	"strings"
	"time"

	"github.com/muonsoft/errors"
)

// ApplyAwardResult holds viewer identity details after an XP-only award grant.
type ApplyAwardResult struct {
	ViewerID    string
	Username    string
	DisplayName string
	AvatarURL   string
}

// ApplyAward upserts the chat identity and adds points to all-time, session, and day XP.
// Empty platform or user_id returns ErrInvalidIdentity. Message counts are not incremented.
func (s *Store) ApplyAward(identity ChatIdentity, points int, dayResetHour int, now time.Time) (*ApplyAwardResult, error) {
	if strings.TrimSpace(identity.UserID) == "" || strings.TrimSpace(identity.Platform) == "" {
		return nil, ErrInvalidIdentity
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if err := s.ensureOpenSessionLocked(now); err != nil {
		return nil, errors.Errorf("ensure open session: %w", err)
	}

	sessionID, err := s.openSessionLocked()
	if err != nil {
		return nil, errors.Errorf("lookup open session: %w", err)
	}

	dayKey := DayKey(now, dayResetHour)
	seenAt := formatTime(now)

	tx, err := s.db.Begin()
	if err != nil {
		return nil, errors.Errorf("begin transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	identity, err = s.mergeExistingIdentityLocked(tx, identity)
	if err != nil {
		return nil, err
	}

	viewerID, err := s.upsertIdentityLocked(tx, identity, seenAt, now)
	if err != nil {
		return nil, err
	}

	if _, execErr := tx.Exec(
		`UPDATE viewers
		 SET xp = xp + ?,
		     last_seen_at = ?
		 WHERE id = ?`,
		points,
		seenAt,
		viewerID,
	); execErr != nil {
		return nil, errors.Errorf("increment viewer xp: %w", execErr)
	}

	if err = s.addPeriodXPLocked(tx, viewerID, sessionID, dayKey, points); err != nil {
		return nil, err
	}

	var username, displayName, avatarURL string
	err = tx.QueryRow(
		`SELECT username, display_name, avatar_url
		 FROM viewer_identities
		 WHERE platform = ? AND user_id = ?`,
		identity.Platform,
		identity.UserID,
	).Scan(&username, &displayName, &avatarURL)
	if err != nil {
		return nil, errors.Errorf("load viewer identity: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, errors.Errorf("commit award grant: %w", err)
	}

	return &ApplyAwardResult{
		ViewerID:    viewerID,
		Username:    username,
		DisplayName: displayName,
		AvatarURL:   avatarURL,
	}, nil
}

func (s *Store) mergeExistingIdentityLocked(tx *sql.Tx, identity ChatIdentity) (ChatIdentity, error) {
	var username, displayName, avatarURL string
	err := tx.QueryRow(
		`SELECT username, display_name, avatar_url
		 FROM viewer_identities
		 WHERE platform = ? AND user_id = ?`,
		identity.Platform,
		identity.UserID,
	).Scan(&username, &displayName, &avatarURL)
	if errors.Is(err, sql.ErrNoRows) {
		return identity, nil
	}
	if err != nil {
		return identity, errors.Errorf("lookup existing identity: %w", err)
	}

	if strings.TrimSpace(identity.Username) == "" {
		identity.Username = username
	}
	if strings.TrimSpace(identity.DisplayName) == "" {
		identity.DisplayName = displayName
	}
	if strings.TrimSpace(identity.AvatarURL) == "" {
		identity.AvatarURL = avatarURL
	}

	return identity, nil
}
