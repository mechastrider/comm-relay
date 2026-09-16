package store

import (
	"database/sql"
	"strings"
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
	if err := s.mergeGreetingStateLocked(tx, fromID, intoID); err != nil {
		return err
	}
	if err := s.sumAllSessionCountersLocked(tx, fromID, intoID); err != nil {
		return err
	}
	if err := s.sumAllDayCountersLocked(tx, fromID, intoID); err != nil {
		return err
	}
	if err := s.mergeProgressionHistoryLocked(tx, fromID, intoID); err != nil {
		return err
	}
	if err := s.rewriteViewerContractsLocked(tx, fromID, intoID); err != nil {
		return err
	}
	if s.mergeHook != nil {
		if err := s.mergeHook(); err != nil {
			return errors.Errorf("run merge test hook: %w", err)
		}
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
	for _, metric := range []ProgressionMetric{
		ProgressionMetricMessageCount,
		ProgressionMetricXP,
		ProgressionMetricAwardCount,
		ProgressionMetricCommandCount,
		ProgressionMetricSessionCount,
		ProgressionMetricContractWinCount,
	} {
		if _, err := s.evaluateProgressionLocked(tx, ProgressionEvaluationInput{ViewerID: intoID, CauseMetric: metric, Backfilled: true, Now: now}); err != nil {
			return errors.Errorf("reconcile merged viewer progression: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return errors.Errorf("commit merge: %w", err)
	}

	return nil
}

// SetMergeHookForTest installs a test-only failure hook before merge commit.
func (s *Store) SetMergeHookForTest(hook func() error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.mergeHook = hook
}

func (s *Store) mergeGreetingStateLocked(tx *sql.Tx, fromID, intoID string) error {
	var fromDisabled, intoDisabled, fromProgressionDisabled, intoProgressionDisabled int
	var fromFirst, intoFirst sql.NullString
	if err := tx.QueryRow(`SELECT greetings_disabled, progression_alerts_disabled, first_ordinary_message_at FROM viewers WHERE id = ?`, fromID).Scan(&fromDisabled, &fromProgressionDisabled, &fromFirst); err != nil {
		return errors.Errorf("load source greeting state: %w", err)
	}
	if err := tx.QueryRow(`SELECT greetings_disabled, progression_alerts_disabled, first_ordinary_message_at FROM viewers WHERE id = ?`, intoID).Scan(&intoDisabled, &intoProgressionDisabled, &intoFirst); err != nil {
		return errors.Errorf("load destination greeting state: %w", err)
	}
	mergedFirst := earlierTimestamp(fromFirst, intoFirst)
	if _, err := tx.Exec(`UPDATE viewers SET greetings_disabled = ?, progression_alerts_disabled = ?, first_ordinary_message_at = ? WHERE id = ?`, boolInt(fromDisabled != 0 || intoDisabled != 0), boolInt(fromProgressionDisabled != 0 || intoProgressionDisabled != 0), mergedFirst, intoID); err != nil {
		return errors.Errorf("merge viewer greeting state: %w", err)
	}
	rows, err := tx.Query(`SELECT session_id, first_ordinary_message_at FROM viewer_session_stats WHERE viewer_id = ?`, fromID)
	if err != nil {
		return errors.Errorf("list source greeting session markers: %w", err)
	}
	defer func() { _ = rows.Close() }()
	for rows.Next() {
		var sessionID string
		var source sql.NullString
		if err := rows.Scan(&sessionID, &source); err != nil {
			return errors.Errorf("scan source greeting session marker: %w", err)
		}
		var destination sql.NullString
		err := tx.QueryRow(`SELECT first_ordinary_message_at FROM viewer_session_stats WHERE viewer_id = ? AND session_id = ?`, intoID, sessionID).Scan(&destination)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return errors.Errorf("load destination greeting session marker: %w", err)
		}
		if _, err := tx.Exec(`INSERT INTO viewer_session_stats (viewer_id, session_id, message_count, xp, first_ordinary_message_at)
			VALUES (?, ?, 0, 0, ?)
			ON CONFLICT(viewer_id, session_id) DO UPDATE SET first_ordinary_message_at = excluded.first_ordinary_message_at`, intoID, sessionID, earlierTimestamp(source, destination)); err != nil {
			return errors.Errorf("merge greeting session marker: %w", err)
		}
	}
	if err := rows.Err(); err != nil {
		return errors.Errorf("iterate source greeting session markers: %w", err)
	}
	return nil
}

func (s *Store) sumAllSessionCountersLocked(tx *sql.Tx, fromID, intoID string) error {
	rows, err := tx.Query(`SELECT session_id, message_count, xp, activity_grants, last_activity_at, first_ordinary_message_at FROM viewer_session_stats WHERE viewer_id = ?`, fromID)
	if err != nil {
		return errors.Errorf("list source session counters: %w", err)
	}
	type sessionRow struct {
		id                                 string
		messages, xp, activityGrants       int
		lastActivity, firstOrdinaryMessage sql.NullString
	}
	source := []sessionRow{}
	for rows.Next() {
		var row sessionRow
		if err := rows.Scan(&row.id, &row.messages, &row.xp, &row.activityGrants, &row.lastActivity, &row.firstOrdinaryMessage); err != nil {
			_ = rows.Close()
			return errors.Errorf("scan source session counters: %w", err)
		}
		source = append(source, row)
	}
	if err := rows.Close(); err != nil {
		return errors.Errorf("close source session counters: %w", err)
	}
	if err := rows.Err(); err != nil {
		return errors.Errorf("iterate source session counters: %w", err)
	}
	for _, row := range source {
		var destLastActivity, destFirstOrdinary sql.NullString
		err := tx.QueryRow(`SELECT last_activity_at, first_ordinary_message_at FROM viewer_session_stats WHERE viewer_id = ? AND session_id = ?`, intoID, row.id).Scan(&destLastActivity, &destFirstOrdinary)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return errors.Errorf("load destination session merge state: %w", err)
		}
		mergedLastActivity, err := laterActivityAt(destLastActivity, row.lastActivity)
		if err != nil {
			return errors.Errorf("merge session last_activity_at: %w", err)
		}
		mergedFirstOrdinary := earlierTimestamp(destFirstOrdinary, row.firstOrdinaryMessage)
		if _, err := tx.Exec(`INSERT INTO viewer_session_stats (viewer_id, session_id, message_count, xp, activity_grants, last_activity_at, first_ordinary_message_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(viewer_id, session_id) DO UPDATE SET
				message_count = viewer_session_stats.message_count + excluded.message_count,
				xp = viewer_session_stats.xp + excluded.xp,
				activity_grants = viewer_session_stats.activity_grants + excluded.activity_grants,
				last_activity_at = excluded.last_activity_at,
				first_ordinary_message_at = excluded.first_ordinary_message_at`, intoID, row.id, row.messages, row.xp, row.activityGrants, mergedLastActivity, mergedFirstOrdinary); err != nil {
			return errors.Errorf("sum session counters: %w", err)
		}
	}
	if _, err := tx.Exec(`DELETE FROM viewer_session_stats WHERE viewer_id = ?`, fromID); err != nil {
		return errors.Errorf("remove source session counters: %w", err)
	}
	return nil
}

func (s *Store) sumAllDayCountersLocked(tx *sql.Tx, fromID, intoID string) error {
	rows, err := tx.Query(`SELECT day_key, message_count, xp FROM viewer_day_stats WHERE viewer_id = ?`, fromID)
	if err != nil {
		return errors.Errorf("list source day counters: %w", err)
	}
	type dayRow struct {
		key          string
		messages, xp int
	}
	source := []dayRow{}
	for rows.Next() {
		var row dayRow
		if err := rows.Scan(&row.key, &row.messages, &row.xp); err != nil {
			_ = rows.Close()
			return errors.Errorf("scan source day counters: %w", err)
		}
		source = append(source, row)
	}
	if err := rows.Close(); err != nil {
		return errors.Errorf("close source day counters: %w", err)
	}
	if err := rows.Err(); err != nil {
		return errors.Errorf("iterate source day counters: %w", err)
	}
	for _, row := range source {
		if _, err := tx.Exec(`INSERT INTO viewer_day_stats (viewer_id, day_key, message_count, xp) VALUES (?, ?, ?, ?)
			ON CONFLICT(viewer_id, day_key) DO UPDATE SET message_count = viewer_day_stats.message_count + excluded.message_count, xp = viewer_day_stats.xp + excluded.xp`, intoID, row.key, row.messages, row.xp); err != nil {
			return errors.Errorf("sum day counters: %w", err)
		}
	}
	if _, err := tx.Exec(`DELETE FROM viewer_day_stats WHERE viewer_id = ?`, fromID); err != nil {
		return errors.Errorf("remove source day counters: %w", err)
	}
	return nil
}

func (s *Store) rewriteViewerContractsLocked(tx *sql.Tx, fromID, intoID string) error {
	if _, err := tx.Exec(`UPDATE viewer_contracts SET winner_viewer_id = ? WHERE winner_viewer_id = ?`, intoID, fromID); err != nil {
		return errors.Errorf("rewrite viewer contract winner: %w", err)
	}
	return nil
}

func (s *Store) mergeProgressionHistoryLocked(tx *sql.Tx, fromID, intoID string) error {
	rows, err := tx.Query(`SELECT id, achievement_id, revision, occurrence, progress_value, name, description, backfilled, unlocked_at, session_id FROM viewer_achievement_unlocks WHERE viewer_id = ?`, fromID)
	if err != nil {
		return errors.Errorf("list source achievement unlocks: %w", err)
	}
	type unlockRow struct {
		id, achievementID, name, description, unlockedAt string
		sessionID                                        sql.NullString
		revision, occurrence, progressValue, backfilled  int
	}
	source := []unlockRow{}
	for rows.Next() {
		var row unlockRow
		if err := rows.Scan(&row.id, &row.achievementID, &row.revision, &row.occurrence, &row.progressValue, &row.name, &row.description, &row.backfilled, &row.unlockedAt, &row.sessionID); err != nil {
			_ = rows.Close()
			return errors.Errorf("scan source achievement unlock: %w", err)
		}
		source = append(source, row)
	}
	if err := rows.Close(); err != nil {
		return errors.Errorf("close source achievement unlocks: %w", err)
	}
	if err := rows.Err(); err != nil {
		return errors.Errorf("iterate source achievement unlocks: %w", err)
	}
	for _, row := range source {
		if _, err := tx.Exec(`INSERT INTO viewer_achievement_unlocks (id, viewer_id, session_id, achievement_id, revision, occurrence, progress_value, name, description, backfilled, unlocked_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(viewer_id, achievement_id, revision, occurrence) DO UPDATE SET
				progress_value = CASE WHEN excluded.unlocked_at < viewer_achievement_unlocks.unlocked_at THEN excluded.progress_value ELSE viewer_achievement_unlocks.progress_value END,
				name = CASE WHEN excluded.unlocked_at < viewer_achievement_unlocks.unlocked_at THEN excluded.name ELSE viewer_achievement_unlocks.name END,
				description = CASE WHEN excluded.unlocked_at < viewer_achievement_unlocks.unlocked_at THEN excluded.description ELSE viewer_achievement_unlocks.description END,
				backfilled = CASE WHEN excluded.unlocked_at < viewer_achievement_unlocks.unlocked_at THEN excluded.backfilled ELSE viewer_achievement_unlocks.backfilled END,
				session_id = CASE WHEN excluded.unlocked_at < viewer_achievement_unlocks.unlocked_at THEN excluded.session_id ELSE viewer_achievement_unlocks.session_id END,
				unlocked_at = CASE WHEN excluded.unlocked_at < viewer_achievement_unlocks.unlocked_at THEN excluded.unlocked_at ELSE viewer_achievement_unlocks.unlocked_at END`, row.id, intoID, row.sessionID, row.achievementID, row.revision, row.occurrence, row.progressValue, row.name, row.description, row.backfilled, row.unlockedAt); err != nil {
			return errors.Errorf("merge achievement unlock: %w", err)
		}
	}
	if _, err := tx.Exec(`DELETE FROM viewer_achievement_unlocks WHERE viewer_id = ?`, fromID); err != nil {
		return errors.Errorf("remove source achievement unlocks: %w", err)
	}
	return nil
}

func boolInt(value bool) int {
	if value {
		return 1
	}
	return 0
}

func earlierTimestamp(a, b sql.NullString) sql.NullString {
	if !a.Valid || strings.TrimSpace(a.String) == "" {
		return b
	}
	if !b.Valid || strings.TrimSpace(b.String) == "" {
		return a
	}
	ta, errA := parseTime(a.String)
	tb, errB := parseTime(b.String)
	if errA == nil && errB == nil && ta.Before(tb) {
		return a
	}
	if errA == nil && errB == nil {
		return b
	}
	if a.String <= b.String {
		return a
	}
	return b
}

func laterActivityAt(a, b sql.NullString) (sql.NullString, error) {
	if !a.Valid || strings.TrimSpace(a.String) == "" {
		return b, nil
	}
	if !b.Valid || strings.TrimSpace(b.String) == "" {
		return a, nil
	}
	ta, errA := parseTime(a.String)
	tb, errB := parseTime(b.String)
	if errA != nil || errB != nil {
		return sql.NullString{}, errors.New("parse session activity timestamp")
	}
	if tb.After(ta) {
		return b, nil
	}
	return a, nil
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
