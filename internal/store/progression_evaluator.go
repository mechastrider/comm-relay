package store

import (
	"database/sql"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/muonsoft/errors"
)

// ProgressionEvaluationInput identifies one fact whose committed value may
// cross a level or achievement threshold. Callers that mutate a fact use the
// locked helper inside that same transaction.
type ProgressionEvaluationInput struct {
	ViewerID      string
	CauseMetric   ProgressionMetric
	PreviousXP    int
	HasPreviousXP bool
	Backfilled    bool
	Now           time.Time
}

// ProgressionEvaluationResult contains only unlocks inserted by this call and
// a derived level transition. It is safe to publish only after the enclosing
// fact transaction commits.
type ProgressionEvaluationResult struct {
	CauseMetric   ProgressionMetric
	Backfilled    bool
	PreviousLevel *ProgressionLevel
	CurrentLevel  *ProgressionLevel
	Unlocks       []AchievementUnlock
}

// ProgressionResultBundle is the complete progression outcome of one durable
// fact mutation. Its contents are safe to publish only after that mutation has
// committed. Evaluations remain available for diagnostics, while callers can
// consume the deduplicated unlock and level-transition fields directly.
type ProgressionResultBundle struct {
	Evaluations   []ProgressionEvaluationResult
	PreviousLevel *ProgressionLevel
	CurrentLevel  *ProgressionLevel
	Unlocks       []AchievementUnlock
}

func newProgressionResultBundle(results ...ProgressionEvaluationResult) ProgressionResultBundle {
	bundle := ProgressionResultBundle{Evaluations: results}
	for _, result := range results {
		if result.PreviousLevel != nil {
			bundle.PreviousLevel = result.PreviousLevel
		}
		if result.CurrentLevel != nil {
			bundle.CurrentLevel = result.CurrentLevel
		}
		bundle.Unlocks = append(bundle.Unlocks, result.Unlocks...)
	}
	return bundle
}

// EvaluateProgression evaluates an already-durable viewer state. Production
// fact writers use evaluateProgressionLocked so their fact and unlocks share a
// transaction; this method is useful for explicit, silent reconciliation.
func (s *Store) EvaluateProgression(input ProgressionEvaluationInput) (ProgressionEvaluationResult, error) {
	input.ViewerID = strings.TrimSpace(input.ViewerID)
	if input.ViewerID == "" || !validProgressionMetric(input.CauseMetric) {
		return ProgressionEvaluationResult{}, ErrProgressionValidation
	}
	if input.Now.IsZero() {
		input.Now = time.Now()
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	tx, err := s.db.Begin()
	if err != nil {
		return ProgressionEvaluationResult{}, errors.Errorf("begin progression evaluation: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	result, err := evaluateProgressionLocked(tx, input)
	if err != nil {
		return ProgressionEvaluationResult{}, err
	}
	if err := tx.Commit(); err != nil {
		return ProgressionEvaluationResult{}, errors.Errorf("commit progression evaluation: %w", err)
	}
	return result, nil
}

func validProgressionMetric(metric ProgressionMetric) bool {
	switch metric {
	case ProgressionMetricMessageCount, ProgressionMetricXP, ProgressionMetricAwardCount,
		ProgressionMetricCommandCount, ProgressionMetricSessionCount, ProgressionMetricContractWinCount:
		return true
	default:
		return false
	}
}

func evaluateProgressionLocked(tx *sql.Tx, input ProgressionEvaluationInput) (ProgressionEvaluationResult, error) {
	if err := loadVisibleViewer(tx, input.ViewerID); err != nil {
		return ProgressionEvaluationResult{}, err
	}
	if input.Now.IsZero() {
		input.Now = time.Now()
	}
	result := ProgressionEvaluationResult{CauseMetric: input.CauseMetric, Backfilled: input.Backfilled}
	if input.HasPreviousXP {
		level, err := progressionLevelAtXP(tx, input.PreviousXP)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return ProgressionEvaluationResult{}, errors.Errorf("resolve previous progression level: %w", err)
		}
		if err == nil {
			result.PreviousLevel = level
		}
	}
	var currentXP int
	if err := tx.QueryRow(`SELECT xp FROM viewers WHERE id = ?`, input.ViewerID).Scan(&currentXP); err != nil {
		return ProgressionEvaluationResult{}, errors.Errorf("read current XP for progression evaluation: %w", err)
	}
	level, err := progressionLevelAtXP(tx, currentXP)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return ProgressionEvaluationResult{}, errors.Errorf("resolve current progression level: %w", err)
	}
	if err == nil {
		result.CurrentLevel = level
	}

	rows, err := tx.Query(`SELECT d.id, d.name, d.description, r.revision, r.metric, r.subject_id, r.target, r.repeatable
		FROM achievement_definitions d
		JOIN achievement_revisions r ON r.achievement_id = d.id AND r.revision = d.active_revision
		WHERE d.enabled = 1 AND d.deleted_at IS NULL AND r.metric = ?
		ORDER BY d.id`, input.CauseMetric)
	if err != nil {
		return ProgressionEvaluationResult{}, errors.Errorf("list affected progression rules: %w", err)
	}
	defer func() { _ = rows.Close() }()
	for rows.Next() {
		var achievementID, name, description string
		var revision, target, repeatable int
		var metric ProgressionMetric
		var subjectID sql.NullString
		if err := rows.Scan(&achievementID, &name, &description, &revision, &metric, &subjectID, &target, &repeatable); err != nil {
			return ProgressionEvaluationResult{}, errors.Errorf("scan affected progression rule: %w", err)
		}
		value, err := progressionMetricValue(tx, input.ViewerID, metric, subjectID.String)
		if err != nil {
			return ProgressionEvaluationResult{}, err
		}
		occurrences := 0
		if repeatable != 0 {
			occurrences = value / target
		} else if value >= target {
			occurrences = 1
		}
		for occurrence := 1; occurrence <= occurrences; occurrence++ {
			unlock := AchievementUnlock{ID: uuid.NewString(), ViewerID: input.ViewerID, AchievementID: achievementID, Revision: revision, Occurrence: occurrence, ProgressValue: value, Name: name, Description: description, Backfilled: input.Backfilled, UnlockedAt: input.Now.UTC()}
			inserted, err := insertAchievementUnlock(tx, unlock)
			if err != nil {
				return ProgressionEvaluationResult{}, err
			}
			if inserted {
				result.Unlocks = append(result.Unlocks, unlock)
			}
		}
	}
	if err := rows.Err(); err != nil {
		return ProgressionEvaluationResult{}, errors.Errorf("iterate affected progression rules: %w", err)
	}
	return result, nil
}

func progressionLevelAtXP(q rowQuerier, xp int) (*ProgressionLevel, error) {
	level, err := scanProgressionLevel(q.QueryRow(`SELECT id, title, min_xp, announce, created_at, updated_at FROM progression_levels WHERE min_xp <= ? ORDER BY min_xp DESC, id DESC LIMIT 1`, xp))
	if err != nil {
		return nil, err
	}
	return &level, nil
}

func insertAchievementUnlock(q execQuerier, unlock AchievementUnlock) (bool, error) {
	result, err := q.Exec(`INSERT INTO viewer_achievement_unlocks (id, viewer_id, achievement_id, revision, occurrence, progress_value, name, description, backfilled, unlocked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(viewer_id, achievement_id, revision, occurrence) DO NOTHING`, unlock.ID, unlock.ViewerID, unlock.AchievementID, unlock.Revision, unlock.Occurrence, unlock.ProgressValue, unlock.Name, unlock.Description, boolInt(unlock.Backfilled), formatTime(unlock.UnlockedAt))
	if err != nil {
		return false, errors.Errorf("insert evaluated achievement unlock: %w", err)
	}
	count, err := result.RowsAffected()
	if err != nil {
		return false, errors.Errorf("count evaluated achievement unlock: %w", err)
	}
	return count != 0, nil
}
