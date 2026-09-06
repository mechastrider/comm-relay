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
	_, err := s.ApplyChatMutationResult(identity, activity, dayResetHour, now)
	return err
}

// ApplyChatResult is like ApplyChat and returns a replaced avatar cache filename when the remote URL rotated.
func (s *Store) ApplyChatResult(
	identity ChatIdentity,
	activity ActivitySettings,
	dayResetHour int,
	now time.Time,
) (string, error) {
	result, err := s.ApplyChatMutationResult(identity, activity, dayResetHour, now)
	return result.ReplacedAvatarCache, err
}

// ChatMutationResult describes the observable effects of one counted chat line.
type ChatMutationResult struct {
	ReplacedAvatarCache  string
	XPChanged            bool
	MeaningfulRankChange bool
}

// ApplyChatMutationResult applies chat and reports whether XP and ordered top-three membership changed.
func (s *Store) ApplyChatMutationResult(
	identity ChatIdentity,
	activity ActivitySettings,
	dayResetHour int,
	now time.Time,
) (ChatMutationResult, error) {
	if strings.TrimSpace(identity.UserID) == "" || strings.TrimSpace(identity.Platform) == "" {
		return ChatMutationResult{}, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if err := s.ensureOpenSessionLocked(now); err != nil {
		return ChatMutationResult{}, errors.Errorf("ensure open session: %w", err)
	}

	sessionID, err := s.openSessionLocked()
	if err != nil {
		return ChatMutationResult{}, errors.Errorf("lookup open session: %w", err)
	}

	dayKey := DayKey(now, dayResetHour)
	seenAt := formatTime(now)

	tx, err := s.db.Begin()
	if err != nil {
		return ChatMutationResult{}, errors.Errorf("begin transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	viewerID, replacedCache, err := s.upsertIdentityLocked(tx, identity, seenAt, now)
	if err != nil {
		return ChatMutationResult{}, err
	}

	xpChanged := false
	var beforeRanks topThreeSnapshot
	if activity.Enabled() {
		xpChanged, err = s.activityGrantEligibleLocked(tx, viewerID, sessionID, activity, now)
		if err != nil {
			return ChatMutationResult{}, err
		}
		if xpChanged {
			beforeRanks, err = captureTopThree(tx, sessionID, dayKey)
			if err != nil {
				return ChatMutationResult{}, err
			}
		}
	}

	if _, execErr := tx.Exec(
		`UPDATE viewers
		 SET message_count = message_count + 1,
		     last_seen_at = ?
		 WHERE id = ?`,
		seenAt,
		viewerID,
	); execErr != nil {
		return ChatMutationResult{}, errors.Errorf("increment viewer message count: %w", execErr)
	}

	if countErr := s.incrementMessageCountsLocked(tx, viewerID, sessionID, dayKey); countErr != nil {
		return ChatMutationResult{}, countErr
	}

	if xpChanged {
		if err := s.grantActivityLocked(tx, viewerID, sessionID, dayKey, activity, now); err != nil {
			return ChatMutationResult{}, err
		}
	}

	meaningfulRankChange := false
	if xpChanged {
		afterRanks, rankErr := captureTopThree(tx, sessionID, dayKey)
		if rankErr != nil {
			return ChatMutationResult{}, rankErr
		}
		meaningfulRankChange = topThreeChanged(beforeRanks, afterRanks)
	}

	if err := tx.Commit(); err != nil {
		return ChatMutationResult{}, errors.Errorf("commit chat ingest: %w", err)
	}

	return ChatMutationResult{
		ReplacedAvatarCache:  replacedCache,
		XPChanged:            xpChanged,
		MeaningfulRankChange: meaningfulRankChange,
	}, nil
}

func (s *Store) activityGrantEligibleLocked(
	tx *sql.Tx,
	viewerID, sessionID string,
	activity ActivitySettings,
	now time.Time,
) (bool, error) {
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
		return true, nil
	}
	if err != nil {
		return false, errors.Errorf("load session activity counters: %w", err)
	}

	if activityGrants >= activity.SessionLimit {
		return false, nil
	}

	if lastActivityRaw.Valid && strings.TrimSpace(lastActivityRaw.String) != "" {
		lastActivity, parseErr := parseTime(lastActivityRaw.String)
		if parseErr != nil {
			return false, parseErr
		}
		if now.Sub(lastActivity) < time.Duration(activity.IntervalSeconds)*time.Second {
			return false, nil
		}
	}

	return true, nil
}

func (s *Store) grantActivityLocked(
	tx *sql.Tx,
	viewerID, sessionID, dayKey string,
	activity ActivitySettings,
	now time.Time,
) error {
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

func (s *Store) upsertIdentityLocked(tx *sql.Tx, identity ChatIdentity, seenAt string, now time.Time) (string, string, error) {
	var viewerID string
	var storedAvatarURL, storedAvatarCache string
	err := tx.QueryRow(
		`SELECT viewer_id, avatar_url, avatar_cache FROM viewer_identities WHERE platform = ? AND user_id = ?`,
		identity.Platform,
		identity.UserID,
	).Scan(&viewerID, &storedAvatarURL, &storedAvatarCache)
	if err == nil {
		avatarURLToStore, avatarCacheToStore, replacedCache := mergeIdentityAvatarFields(
			storedAvatarURL,
			storedAvatarCache,
			identity.AvatarURL,
		)
		if _, updateErr := tx.Exec(
			`UPDATE viewer_identities
			 SET username = ?, display_name = ?, avatar_url = ?, avatar_cache = ?, last_seen_at = ?
			 WHERE platform = ? AND user_id = ?`,
			identity.Username,
			identity.DisplayName,
			avatarURLToStore,
			avatarCacheToStore,
			seenAt,
			identity.Platform,
			identity.UserID,
		); updateErr != nil {
			return "", "", errors.Errorf("update viewer identity: %w", updateErr)
		}

		return viewerID, replacedCache, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return "", "", errors.Errorf("lookup viewer identity: %w", err)
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
		return "", "", errors.Errorf("insert viewer: %w", err)
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
		return "", "", errors.Errorf("insert viewer identity: %w", err)
	}

	return viewerID, "", nil
}

func mergeIdentityAvatarFields(storedURL, storedCache, incomingURL string) (avatarURL string, avatarCache string, replacedCache string) {
	incomingURL = strings.TrimSpace(incomingURL)
	if incomingURL == "" {
		return storedURL, storedCache, ""
	}
	if incomingURL != strings.TrimSpace(storedURL) {
		replacedCache = strings.TrimSpace(storedCache)
		return incomingURL, "", replacedCache
	}
	return incomingURL, storedCache, ""
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
