package store

import (
	"database/sql"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/muonsoft/errors"
)

const (
	maxProgressionDefinitions = 200
	maxProgressionNameRunes   = 64
	maxProgressionDescription = 240
	maxProgressionTarget      = 1_000_000_000
)

// CreateProgressionLevelInput describes a new XP title threshold.
type CreateProgressionLevelInput struct {
	ID       string
	Title    string
	MinXP    int
	Announce bool
	Now      time.Time
}

// UpdateProgressionLevelInput describes a replacement XP title threshold.
type UpdateProgressionLevelInput = CreateProgressionLevelInput

func normalizeProgressionText(value string, limit int, required bool) (string, error) {
	value = strings.TrimSpace(value)
	if (required && value == "") || utf8.RuneCountInString(value) > limit {
		return "", ErrProgressionValidation
	}
	return value, nil
}

func validateProgressionMetric(metric ProgressionMetric, subjectID string, target int) error {
	if target < 1 || target > maxProgressionTarget {
		return ErrProgressionValidation
	}
	subjectID = strings.TrimSpace(subjectID)
	switch metric {
	case ProgressionMetricMessageCount, ProgressionMetricXP, ProgressionMetricSessionCount, ProgressionMetricContractWinCount:
		if subjectID != "" {
			return ErrProgressionValidation
		}
	case ProgressionMetricAwardCount, ProgressionMetricCommandCount:
		if subjectID == "" {
			return ErrProgressionValidation
		}
	default:
		return ErrProgressionValidation
	}
	return nil
}

// ProgressionMetricValue returns the durable value for one supported viewer fact.
// Deleted award and command subjects deliberately retain their historical event
// count; without a current catalog row they can no longer receive new events.
func (s *Store) ProgressionMetricValue(viewerID string, metric ProgressionMetric, subjectID string) (int, error) {
	viewerID = strings.TrimSpace(viewerID)
	if viewerID == "" {
		return 0, ErrNotFound
	}
	if err := validateProgressionMetric(metric, subjectID, 1); err != nil {
		return 0, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := loadVisibleViewer(s.db, viewerID); err != nil {
		return 0, err
	}
	return progressionMetricValue(s.db, viewerID, metric, strings.TrimSpace(subjectID))
}

func progressionMetricValue(q rowQuerier, viewerID string, metric ProgressionMetric, subjectID string) (int, error) {
	query, args := progressionMetricQuery(viewerID, metric, subjectID)
	var value int
	if err := q.QueryRow(query, args...).Scan(&value); err != nil {
		return 0, errors.Errorf("read progression metric %q: %w", metric, err)
	}
	return value, nil
}

func progressionMetricQuery(viewerID string, metric ProgressionMetric, subjectID string) (string, []any) {
	switch metric {
	case ProgressionMetricMessageCount:
		return `SELECT message_count FROM viewers WHERE id = ?`, []any{viewerID}
	case ProgressionMetricXP:
		return `SELECT xp FROM viewers WHERE id = ?`, []any{viewerID}
	case ProgressionMetricAwardCount:
		return `SELECT COUNT(*) FROM interaction_events WHERE viewer_id = ? AND kind = 'award' AND award_id = ?`, []any{viewerID, subjectID}
	case ProgressionMetricCommandCount:
		return `SELECT COUNT(*) FROM interaction_events WHERE viewer_id = ? AND kind = 'command' AND command_id = ?`, []any{viewerID, subjectID}
	case ProgressionMetricSessionCount:
		return `SELECT COUNT(*) FROM viewer_session_stats WHERE viewer_id = ? AND message_count > 0`, []any{viewerID}
	case ProgressionMetricContractWinCount:
		return `SELECT COUNT(*) FROM viewer_contracts WHERE winner_viewer_id = ? AND status = 'awarded'`, []any{viewerID}
	default:
		return "", nil
	}
}

// ResolveProgressionLevel returns the highest threshold satisfied by all-time XP.
func (s *Store) ResolveProgressionLevel(xp int) (*ProgressionLevel, error) {
	if xp < 0 {
		return nil, ErrProgressionValidation
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	level, err := scanProgressionLevel(s.db.QueryRow(`SELECT id, title, min_xp, announce, created_at, updated_at FROM progression_levels WHERE min_xp <= ? ORDER BY min_xp DESC, id DESC LIMIT 1`, xp))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrProgressionLevelNotFound
	}
	if err != nil {
		return nil, errors.Errorf("resolve progression level: %w", err)
	}
	return &level, nil
}

// ViewerProgressionLevel resolves a visible viewer's current level from XP.
func (s *Store) ViewerProgressionLevel(viewerID string) (*ProgressionLevel, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := loadVisibleViewer(s.db, strings.TrimSpace(viewerID)); err != nil {
		return nil, err
	}
	var xp int
	if err := s.db.QueryRow(`SELECT xp FROM viewers WHERE id = ?`, strings.TrimSpace(viewerID)).Scan(&xp); err != nil {
		return nil, errors.Errorf("read viewer XP for progression level: %w", err)
	}
	level, err := scanProgressionLevel(s.db.QueryRow(`SELECT id, title, min_xp, announce, created_at, updated_at FROM progression_levels WHERE min_xp <= ? ORDER BY min_xp DESC, id DESC LIMIT 1`, xp))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrProgressionLevelNotFound
	}
	if err != nil {
		return nil, errors.Errorf("resolve viewer progression level: %w", err)
	}
	return &level, nil
}

// GetViewerProgression returns a bounded, current-rule progression read for a
// visible viewer. Historical unlock snapshots are included independently from
// current rule revisions.
func (s *Store) GetViewerProgression(viewerID string) (*ViewerProgression, error) {
	viewerID = strings.TrimSpace(viewerID)
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := loadVisibleViewer(s.db, viewerID); err != nil {
		return nil, err
	}
	var xp int
	if err := s.db.QueryRow(`SELECT xp FROM viewers WHERE id = ?`, viewerID).Scan(&xp); err != nil {
		return nil, errors.Errorf("read viewer XP for progression: %w", err)
	}
	result := &ViewerProgression{ViewerID: viewerID, XP: xp, Achievements: []ViewerAchievementProgress{}, Unlocks: []AchievementUnlock{}}
	current, err := progressionLevelAtXP(s.db, xp)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, errors.Errorf("resolve viewer progression level: %w", err)
	}
	if err == nil {
		result.CurrentLevel = current
	}
	next, err := scanProgressionLevel(s.db.QueryRow(`SELECT id, title, min_xp, announce, created_at, updated_at FROM progression_levels WHERE min_xp > ? ORDER BY min_xp, id LIMIT 1`, xp))
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, errors.Errorf("resolve next progression level: %w", err)
	}
	if err == nil {
		result.NextLevel = &next
	}
	achievements, err := s.listAchievementsLocked(false)
	if err != nil {
		return nil, err
	}
	for _, definition := range achievements {
		value, metricErr := progressionMetricValue(s.db, viewerID, definition.Revision.Metric, definition.Revision.SubjectID)
		if metricErr != nil {
			return nil, metricErr
		}
		var occurrences int
		if countErr := s.db.QueryRow(`SELECT COUNT(*) FROM viewer_achievement_unlocks WHERE viewer_id = ? AND achievement_id = ? AND revision = ?`, viewerID, definition.ID, definition.ActiveRevision).Scan(&occurrences); countErr != nil {
			return nil, errors.Errorf("count viewer achievement unlocks: %w", countErr)
		}
		result.Achievements = append(result.Achievements, ViewerAchievementProgress{Definition: definition, Value: value, Occurrences: occurrences})
	}
	rows, err := s.db.Query(`SELECT id, viewer_id, session_id, achievement_id, revision, occurrence, progress_value, name, description, backfilled, unlocked_at FROM viewer_achievement_unlocks WHERE viewer_id = ? ORDER BY unlocked_at DESC, id DESC`, viewerID)
	if err != nil {
		return nil, errors.Errorf("list viewer progression unlocks: %w", err)
	}
	defer func() { _ = rows.Close() }()
	for rows.Next() {
		unlock, err := scanAchievementUnlock(rows)
		if err != nil {
			return nil, errors.Errorf("scan viewer progression unlock: %w", err)
		}
		result.Unlocks = append(result.Unlocks, unlock)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.Errorf("iterate viewer progression unlocks: %w", err)
	}
	return result, nil
}

// ListProgressionLevels returns levels sorted by threshold.
func (s *Store) ListProgressionLevels() ([]ProgressionLevel, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rows, err := s.db.Query(`SELECT id, title, min_xp, announce, created_at, updated_at FROM progression_levels ORDER BY min_xp, id`)
	if err != nil {
		return nil, errors.Errorf("list progression levels: %w", err)
	}
	defer func() { _ = rows.Close() }()
	levels := make([]ProgressionLevel, 0)
	for rows.Next() {
		level, scanErr := scanProgressionLevel(rows)
		if scanErr != nil {
			return nil, errors.Errorf("scan progression level: %w", scanErr)
		}
		levels = append(levels, level)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.Errorf("iterate progression levels: %w", err)
	}
	return levels, nil
}

// CreateProgressionLevel adds one unique XP threshold.
func (s *Store) CreateProgressionLevel(input CreateProgressionLevelInput) (*ProgressionLevel, error) {
	title, err := normalizeProgressionText(input.Title, maxProgressionNameRunes, true)
	if err != nil || input.MinXP < 0 || input.MinXP > maxProgressionTarget {
		return nil, ErrProgressionValidation
	}
	id := strings.TrimSpace(input.ID)
	if id == "" {
		id = uuid.NewString()
	}
	now := input.Now
	if now.IsZero() {
		now = time.Now()
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, err := s.db.Exec(`INSERT INTO progression_levels (id, title, min_xp, announce, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`, id, title, input.MinXP, boolInt(input.Announce), formatTime(now), formatTime(now)); err != nil {
		return nil, errors.Errorf("insert progression level: %w", err)
	}
	return s.getProgressionLevelLocked(id)
}

// UpdateProgressionLevel changes an existing level without allowing its baseline threshold to move.
func (s *Store) UpdateProgressionLevel(input UpdateProgressionLevelInput) (*ProgressionLevel, error) {
	title, err := normalizeProgressionText(input.Title, maxProgressionNameRunes, true)
	if err != nil || input.MinXP < 0 || input.MinXP > maxProgressionTarget {
		return nil, ErrProgressionValidation
	}
	id := strings.TrimSpace(input.ID)
	if id == "" {
		return nil, ErrProgressionLevelNotFound
	}
	now := input.Now
	if now.IsZero() {
		now = time.Now()
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	current, err := s.getProgressionLevelLocked(id)
	if err != nil {
		return nil, err
	}
	if current.MinXP == 0 && input.MinXP != 0 {
		return nil, ErrBaselineLevel
	}
	result, err := s.db.Exec(`UPDATE progression_levels SET title = ?, min_xp = ?, announce = ?, updated_at = ? WHERE id = ?`, title, input.MinXP, boolInt(input.Announce), formatTime(now), id)
	if err != nil {
		return nil, errors.Errorf("update progression level: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return nil, errors.Errorf("count progression level update: %w", err)
	}
	if affected == 0 {
		return nil, ErrProgressionLevelNotFound
	}
	return s.getProgressionLevelLocked(id)
}

// DeleteProgressionLevel removes a non-baseline level.
func (s *Store) DeleteProgressionLevel(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	level, err := s.getProgressionLevelLocked(strings.TrimSpace(id))
	if err != nil {
		return err
	}
	if level.MinXP == 0 {
		return ErrBaselineLevel
	}
	if _, err := s.db.Exec(`DELETE FROM progression_levels WHERE id = ?`, level.ID); err != nil {
		return errors.Errorf("delete progression level: %w", err)
	}
	return nil
}

func (s *Store) getProgressionLevelLocked(id string) (*ProgressionLevel, error) {
	level, err := scanProgressionLevel(s.db.QueryRow(`SELECT id, title, min_xp, announce, created_at, updated_at FROM progression_levels WHERE id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrProgressionLevelNotFound
	}
	if err != nil {
		return nil, errors.Errorf("get progression level: %w", err)
	}
	return &level, nil
}

func scanProgressionLevel(scanner interface{ Scan(...any) error }) (ProgressionLevel, error) {
	var level ProgressionLevel
	var announce int
	var created, updated string
	if err := scanner.Scan(&level.ID, &level.Title, &level.MinXP, &announce, &created, &updated); err != nil {
		return ProgressionLevel{}, err
	}
	var err error
	level.CreatedAt, err = parseTime(created)
	if err != nil {
		return ProgressionLevel{}, err
	}
	level.UpdatedAt, err = parseTime(updated)
	if err != nil {
		return ProgressionLevel{}, err
	}
	level.Announce = announce != 0
	return level, nil
}

// CreateAchievementInput includes both presentation and the first immutable revision.
type CreateAchievementInput struct {
	ID, Name, Description                 string
	Enabled, Secret, Announce, Repeatable bool
	Metric                                ProgressionMetric
	SubjectID, SubjectLabel               string
	Target                                int
	Now                                   time.Time
}

// UpdateAchievementInput changes presentation and optionally creates a new revision.
type UpdateAchievementInput = CreateAchievementInput

// ListAchievements returns active definitions and their active revisions.
func (s *Store) ListAchievements() ([]AchievementDefinition, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.listAchievementsLocked(false)
}

// GetAchievement returns one active achievement and its active revision.
func (s *Store) GetAchievement(id string) (*AchievementDefinition, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	item, err := s.getAchievementLocked(strings.TrimSpace(id))
	if err != nil {
		return nil, err
	}
	if !item.DeletedAt.IsZero() {
		return nil, ErrAchievementNotFound
	}
	return item, nil
}

func (s *Store) listAchievementsLocked(includeDeleted bool) ([]AchievementDefinition, error) {
	where := "WHERE d.deleted_at IS NULL"
	if includeDeleted {
		where = ""
	}
	rows, err := s.db.Query(`SELECT d.id, d.name, d.description, d.enabled, d.secret, d.announce, d.active_revision, d.deleted_at, d.created_at, d.updated_at, r.metric, r.subject_id, r.subject_label, r.target, r.repeatable, r.created_at FROM achievement_definitions d JOIN achievement_revisions r ON r.achievement_id = d.id AND r.revision = d.active_revision ` + where + ` ORDER BY d.name, d.id`)
	if err != nil {
		return nil, errors.Errorf("list achievements: %w", err)
	}
	defer func() { _ = rows.Close() }()
	items := []AchievementDefinition{}
	for rows.Next() {
		item, err := scanAchievement(rows)
		if err != nil {
			return nil, errors.Errorf("scan achievement: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.Errorf("iterate achievements: %w", err)
	}
	return items, nil
}

// CreateAchievement validates and inserts an achievement with revision 1 atomically.
func (s *Store) CreateAchievement(input CreateAchievementInput) (*AchievementDefinition, error) {
	input.ID = strings.TrimSpace(input.ID)
	if input.ID == "" {
		input.ID = uuid.NewString()
	}
	return s.saveAchievement(input, true)
}

// UpdateAchievement updates presentation and creates a revision only when the condition changes.
func (s *Store) UpdateAchievement(input UpdateAchievementInput) (*AchievementDefinition, error) {
	return s.saveAchievement(input, false)
}

func (s *Store) saveAchievement(input CreateAchievementInput, create bool) (*AchievementDefinition, error) {
	name, err := normalizeProgressionText(input.Name, maxProgressionNameRunes, true)
	if err != nil {
		return nil, err
	}
	description, err := normalizeProgressionText(input.Description, maxProgressionDescription, false)
	if err != nil {
		return nil, err
	}
	if metricErr := validateProgressionMetric(input.Metric, input.SubjectID, input.Target); metricErr != nil {
		return nil, metricErr
	}
	now := input.Now
	if now.IsZero() {
		now = time.Now()
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	tx, err := s.db.Begin()
	if err != nil {
		return nil, errors.Errorf("begin achievement save: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	if create {
		var count int
		if countErr := tx.QueryRow(`SELECT COUNT(*) FROM achievement_definitions WHERE deleted_at IS NULL`).Scan(&count); countErr != nil {
			return nil, errors.Errorf("count achievements: %w", countErr)
		}
		if count >= maxProgressionDefinitions {
			return nil, ErrProgressionValidation
		}
		if subjectErr := validateAchievementSubject(tx, input.Metric, input.SubjectID); subjectErr != nil {
			return nil, subjectErr
		}
		_, err = tx.Exec(`INSERT INTO achievement_definitions (id, name, description, enabled, secret, announce, active_revision, deleted_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, NULL, ?, ?)`, input.ID, name, description, boolInt(input.Enabled), boolInt(input.Secret), boolInt(input.Announce), formatTime(now), formatTime(now))
		if err == nil {
			_, err = tx.Exec(`INSERT INTO achievement_revisions (achievement_id, revision, metric, subject_id, subject_label, target, repeatable, created_at) VALUES (?, 1, ?, ?, ?, ?, ?, ?)`, input.ID, input.Metric, nullString(input.SubjectID), strings.TrimSpace(input.SubjectLabel), input.Target, boolInt(input.Repeatable), formatTime(now))
		}
		if err != nil {
			return nil, errors.Errorf("insert achievement: %w", err)
		}
	} else {
		current, err := getAchievement(tx, input.ID)
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrAchievementNotFound
		}
		if err != nil {
			return nil, errors.Errorf("get achievement: %w", err)
		}
		if !current.DeletedAt.IsZero() {
			return nil, ErrAchievementNotFound
		}
		conditionChanged := current.Revision.Metric != input.Metric || current.Revision.SubjectID != strings.TrimSpace(input.SubjectID) || current.Revision.Target != input.Target || current.Revision.Repeatable != input.Repeatable
		if conditionChanged {
			if err := validateAchievementSubject(tx, input.Metric, input.SubjectID); err != nil {
				return nil, err
			}
			next := current.ActiveRevision + 1
			if _, err := tx.Exec(`INSERT INTO achievement_revisions (achievement_id, revision, metric, subject_id, subject_label, target, repeatable, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, input.ID, next, input.Metric, nullString(input.SubjectID), strings.TrimSpace(input.SubjectLabel), input.Target, boolInt(input.Repeatable), formatTime(now)); err != nil {
				return nil, errors.Errorf("insert achievement revision: %w", err)
			}
			if _, err := tx.Exec(`UPDATE achievement_definitions SET name = ?, description = ?, enabled = ?, secret = ?, announce = ?, active_revision = ?, updated_at = ? WHERE id = ?`, name, description, boolInt(input.Enabled), boolInt(input.Secret), boolInt(input.Announce), next, formatTime(now), input.ID); err != nil {
				return nil, errors.Errorf("update achievement: %w", err)
			}
		} else if _, err := tx.Exec(`UPDATE achievement_definitions SET name = ?, description = ?, enabled = ?, secret = ?, announce = ?, updated_at = ? WHERE id = ?`, name, description, boolInt(input.Enabled), boolInt(input.Secret), boolInt(input.Announce), formatTime(now), input.ID); err != nil {
			return nil, errors.Errorf("update achievement: %w", err)
		}
	}
	if err := requestProgressionReconciliationLocked(tx, now); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, errors.Errorf("commit achievement save: %w", err)
	}
	return s.getAchievementLocked(input.ID)
}

func validateAchievementSubject(q rowQuerier, metric ProgressionMetric, id string) error {
	if metric != ProgressionMetricAwardCount && metric != ProgressionMetricCommandCount {
		return nil
	}
	var found string
	query := `SELECT id FROM award_types WHERE id = ?`
	if metric == ProgressionMetricCommandCount {
		query = `SELECT id FROM commands WHERE id = ?`
	}
	if err := q.QueryRow(query, strings.TrimSpace(id)).Scan(&found); errors.Is(err, sql.ErrNoRows) {
		return ErrProgressionValidation
	} else if err != nil {
		return errors.Errorf("validate achievement subject: %w", err)
	}
	return nil
}

// DeleteAchievement stops future evaluation while retaining historical revisions and unlocks.
func (s *Store) DeleteAchievement(id string, now time.Time) error {
	if now.IsZero() {
		now = time.Now()
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	result, err := s.db.Exec(`UPDATE achievement_definitions SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`, formatTime(now), formatTime(now), strings.TrimSpace(id))
	if err != nil {
		return errors.Errorf("delete achievement: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return errors.Errorf("count achievement delete: %w", err)
	}
	if affected == 0 {
		return ErrAchievementNotFound
	}
	return nil
}

func (s *Store) getAchievementLocked(id string) (*AchievementDefinition, error) {
	item, err := getAchievement(s.db, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrAchievementNotFound
	}
	if err != nil {
		return nil, errors.Errorf("get achievement: %w", err)
	}
	return item, nil
}

func getAchievement(q rowQuerier, id string) (*AchievementDefinition, error) {
	item, err := scanAchievement(q.QueryRow(`SELECT d.id, d.name, d.description, d.enabled, d.secret, d.announce, d.active_revision, d.deleted_at, d.created_at, d.updated_at, r.metric, r.subject_id, r.subject_label, r.target, r.repeatable, r.created_at FROM achievement_definitions d JOIN achievement_revisions r ON r.achievement_id = d.id AND r.revision = d.active_revision WHERE d.id = ?`, id))
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func scanAchievement(scanner interface{ Scan(...any) error }) (AchievementDefinition, error) {
	var item AchievementDefinition
	var enabled, secret, announce, repeatable int
	var deleted sql.NullString
	var created, updated, revisionCreated string
	var subject sql.NullString
	err := scanner.Scan(&item.ID, &item.Name, &item.Description, &enabled, &secret, &announce, &item.ActiveRevision, &deleted, &created, &updated, &item.Revision.Metric, &subject, &item.Revision.SubjectLabel, &item.Revision.Target, &repeatable, &revisionCreated)
	if err != nil {
		return AchievementDefinition{}, err
	}
	item.Enabled, item.Secret, item.Announce = enabled != 0, secret != 0, announce != 0
	item.Revision.AchievementID, item.Revision.Revision, item.Revision.Repeatable = item.ID, item.ActiveRevision, repeatable != 0
	if subject.Valid {
		item.Revision.SubjectID = subject.String
	}
	var parseErr error
	item.CreatedAt, parseErr = parseTime(created)
	if parseErr != nil {
		return AchievementDefinition{}, parseErr
	}
	item.UpdatedAt, parseErr = parseTime(updated)
	if parseErr != nil {
		return AchievementDefinition{}, parseErr
	}
	item.Revision.CreatedAt, parseErr = parseTime(revisionCreated)
	if parseErr != nil {
		return AchievementDefinition{}, parseErr
	}
	if deleted.Valid {
		item.DeletedAt, parseErr = parseTime(deleted.String)
		if parseErr != nil {
			return AchievementDefinition{}, parseErr
		}
	}
	return item, nil
}

// ListAchievementUnlocks returns a viewer's immutable unlock history.
func (s *Store) ListAchievementUnlocks(viewerID string) ([]AchievementUnlock, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rows, err := s.db.Query(`SELECT id, viewer_id, session_id, achievement_id, revision, occurrence, progress_value, name, description, backfilled, unlocked_at FROM viewer_achievement_unlocks WHERE viewer_id = ? ORDER BY unlocked_at DESC, id DESC`, strings.TrimSpace(viewerID))
	if err != nil {
		return nil, errors.Errorf("list achievement unlocks: %w", err)
	}
	defer func() { _ = rows.Close() }()
	items := []AchievementUnlock{}
	for rows.Next() {
		item, err := scanAchievementUnlock(rows)
		if err != nil {
			return nil, errors.Errorf("scan achievement unlock: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.Errorf("iterate achievement unlocks: %w", err)
	}
	return items, nil
}

func scanAchievementUnlock(scanner interface{ Scan(...any) error }) (AchievementUnlock, error) {
	var item AchievementUnlock
	var sessionID sql.NullString
	var backfilled int
	var unlocked string
	if err := scanner.Scan(&item.ID, &item.ViewerID, &sessionID, &item.AchievementID, &item.Revision, &item.Occurrence, &item.ProgressValue, &item.Name, &item.Description, &backfilled, &unlocked); err != nil {
		return AchievementUnlock{}, err
	}
	if sessionID.Valid {
		item.SessionID = sessionID.String
	}
	var err error
	item.UnlockedAt, err = parseTime(unlocked)
	if err != nil {
		return AchievementUnlock{}, err
	}
	item.Backfilled = backfilled != 0
	return item, nil
}

// InsertAchievementUnlockInput preserves a committed unlock. It is primarily
// used by the evaluator and reconciler; uniqueness makes retry safe.
type InsertAchievementUnlockInput struct {
	ID            string
	ViewerID      string
	SessionID     string
	AchievementID string
	Revision      int
	Occurrence    int
	ProgressValue int
	Name          string
	Description   string
	Backfilled    bool
	UnlockedAt    time.Time
}

// InsertAchievementUnlock inserts one immutable unlock and reports whether it
// was new. A duplicate occurrence is a successful idempotent retry.
func (s *Store) InsertAchievementUnlock(input InsertAchievementUnlockInput) (bool, error) {
	if strings.TrimSpace(input.ViewerID) == "" || strings.TrimSpace(input.AchievementID) == "" ||
		input.Revision < 1 || input.Occurrence < 1 || input.ProgressValue < 0 {
		return false, ErrProgressionValidation
	}
	name, err := normalizeProgressionText(input.Name, maxProgressionNameRunes, true)
	if err != nil {
		return false, err
	}
	description, err := normalizeProgressionText(input.Description, maxProgressionDescription, false)
	if err != nil {
		return false, err
	}
	if input.ID == "" {
		input.ID = uuid.NewString()
	}
	if input.UnlockedAt.IsZero() {
		input.UnlockedAt = time.Now()
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	var sessionID any
	if strings.TrimSpace(input.SessionID) != "" && !input.Backfilled {
		sessionID = strings.TrimSpace(input.SessionID)
	}
	result, err := s.db.Exec(`INSERT INTO viewer_achievement_unlocks (id, viewer_id, session_id, achievement_id, revision, occurrence, progress_value, name, description, backfilled, unlocked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(viewer_id, achievement_id, revision, occurrence) DO NOTHING`, input.ID, strings.TrimSpace(input.ViewerID), sessionID, strings.TrimSpace(input.AchievementID), input.Revision, input.Occurrence, input.ProgressValue, name, description, boolInt(input.Backfilled), formatTime(input.UnlockedAt))
	if err != nil {
		return false, errors.Errorf("insert achievement unlock: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return false, errors.Errorf("count achievement unlock insert: %w", err)
	}
	return affected != 0, nil
}

// GetProgressionAlertSettings returns singleton settings, using safe defaults before bootstrap.
func (s *Store) GetProgressionAlertSettings() (*ProgressionAlertSettings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.getProgressionAlertSettingsLocked()
}

func (s *Store) getProgressionAlertSettingsLocked() (*ProgressionAlertSettings, error) {
	settings, err := scanProgressionAlertSettings(s.db.QueryRow(`SELECT achievement_enabled, level_enabled, layout, sound, sound_volume, duration_ms, created_at, updated_at FROM progression_alert_settings WHERE id = 1`))
	if errors.Is(err, sql.ErrNoRows) {
		return &ProgressionAlertSettings{Layout: "card", SoundVolume: 70, DurationMs: 5000}, nil
	}
	if err != nil {
		return nil, errors.Errorf("get progression alert settings: %w", err)
	}
	return &settings, nil
}

// UpdateProgressionAlertSettings replaces the singleton configuration.
func (s *Store) UpdateProgressionAlertSettings(settings ProgressionAlertSettings, now time.Time) (*ProgressionAlertSettings, error) {
	if err := ValidateProgressionAlertSettings(settings); err != nil {
		return nil, err
	}
	if now.IsZero() {
		now = time.Now()
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`INSERT INTO progression_alert_settings (id, achievement_enabled, level_enabled, layout, sound, sound_volume, duration_ms, created_at, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET achievement_enabled = excluded.achievement_enabled, level_enabled = excluded.level_enabled, layout = excluded.layout, sound = excluded.sound, sound_volume = excluded.sound_volume, duration_ms = excluded.duration_ms, updated_at = excluded.updated_at`, boolInt(settings.AchievementEnabled), boolInt(settings.LevelEnabled), strings.TrimSpace(strings.ToLower(settings.Layout)), strings.TrimSpace(settings.Sound), settings.SoundVolume, settings.DurationMs, formatTime(now), formatTime(now))
	if err != nil {
		return nil, errors.Errorf("save progression alert settings: %w", err)
	}
	return s.getProgressionAlertSettingsLocked()
}

// ValidateProgressionAlertSettings checks a complete draft without persisting it.
func ValidateProgressionAlertSettings(settings ProgressionAlertSettings) error {
	if !allowedCatalogLayouts[strings.TrimSpace(strings.ToLower(settings.Layout))] || settings.SoundVolume < 0 || settings.SoundVolume > 100 || settings.DurationMs < 1 {
		return ErrProgressionValidation
	}
	if err := validateCatalogSound(settings.Sound); err != nil {
		return ErrProgressionValidation
	}
	return nil
}

func scanProgressionAlertSettings(scanner interface{ Scan(...any) error }) (ProgressionAlertSettings, error) {
	var settings ProgressionAlertSettings
	var achievements, level int
	var created, updated string
	if err := scanner.Scan(&achievements, &level, &settings.Layout, &settings.Sound, &settings.SoundVolume, &settings.DurationMs, &created, &updated); err != nil {
		return ProgressionAlertSettings{}, err
	}
	var err error
	settings.CreatedAt, err = parseTime(created)
	if err != nil {
		return ProgressionAlertSettings{}, err
	}
	settings.UpdatedAt, err = parseTime(updated)
	if err != nil {
		return ProgressionAlertSettings{}, err
	}
	settings.AchievementEnabled, settings.LevelEnabled = achievements != 0, level != 0
	return settings, nil
}

// GetProgressionReconciliationStatus returns the persisted worker checkpoint.
func (s *Store) GetProgressionReconciliationStatus() (*ProgressionReconciliationStatus, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	status, err := scanProgressionReconciliationStatus(s.db.QueryRow(`SELECT bootstrap_state, requested_generation, completed_generation, status, last_viewer_id, created_at, updated_at FROM progression_reconciliation WHERE id = 1`))
	if errors.Is(err, sql.ErrNoRows) {
		return &ProgressionReconciliationStatus{BootstrapState: "complete", Status: "idle"}, nil
	}
	if err != nil {
		return nil, errors.Errorf("get progression reconciliation status: %w", err)
	}
	return &status, nil
}

// UpdateProgressionReconciliationStatus stores a validated reconciliation checkpoint.
func (s *Store) UpdateProgressionReconciliationStatus(status ProgressionReconciliationStatus, now time.Time) (*ProgressionReconciliationStatus, error) {
	if !validProgressionReconciliationStatus(status.Status) || status.RequestedGeneration < 0 ||
		status.CompletedGeneration < 0 || status.CompletedGeneration > status.RequestedGeneration ||
		strings.TrimSpace(status.BootstrapState) == "" {
		return nil, ErrProgressionValidation
	}
	if now.IsZero() {
		now = time.Now()
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	_, err := s.db.Exec(`INSERT INTO progression_reconciliation (id, bootstrap_state, requested_generation, completed_generation, status, last_viewer_id, created_at, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET bootstrap_state = excluded.bootstrap_state, requested_generation = excluded.requested_generation, completed_generation = excluded.completed_generation, status = excluded.status, last_viewer_id = excluded.last_viewer_id, updated_at = excluded.updated_at`, strings.TrimSpace(status.BootstrapState), status.RequestedGeneration, status.CompletedGeneration, status.Status, nullString(status.LastViewerID), formatTime(now), formatTime(now))
	if err != nil {
		return nil, errors.Errorf("save progression reconciliation status: %w", err)
	}
	return s.getProgressionReconciliationStatusLocked()
}

func validProgressionReconciliationStatus(value string) bool {
	switch value {
	case "idle", "pending", "running", "paused", "failed":
		return true
	default:
		return false
	}
}

func (s *Store) getProgressionReconciliationStatusLocked() (*ProgressionReconciliationStatus, error) {
	status, err := scanProgressionReconciliationStatus(s.db.QueryRow(`SELECT bootstrap_state, requested_generation, completed_generation, status, last_viewer_id, created_at, updated_at FROM progression_reconciliation WHERE id = 1`))
	if errors.Is(err, sql.ErrNoRows) {
		return &ProgressionReconciliationStatus{BootstrapState: "complete", Status: "idle"}, nil
	}
	if err != nil {
		return nil, errors.Errorf("get progression reconciliation status: %w", err)
	}
	return &status, nil
}

func scanProgressionReconciliationStatus(scanner interface{ Scan(...any) error }) (ProgressionReconciliationStatus, error) {
	var status ProgressionReconciliationStatus
	var last sql.NullString
	var created, updated string
	if err := scanner.Scan(&status.BootstrapState, &status.RequestedGeneration, &status.CompletedGeneration, &status.Status, &last, &created, &updated); err != nil {
		return ProgressionReconciliationStatus{}, err
	}
	var err error
	status.CreatedAt, err = parseTime(created)
	if err != nil {
		return ProgressionReconciliationStatus{}, err
	}
	status.UpdatedAt, err = parseTime(updated)
	if err != nil {
		return ProgressionReconciliationStatus{}, err
	}
	if last.Valid {
		status.LastViewerID = last.String
	}
	return status, nil
}
