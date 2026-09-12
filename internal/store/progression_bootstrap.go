package store

import (
	"database/sql"
	"strings"
	"time"

	"github.com/muonsoft/errors"
)

type progressionStarterLevel struct {
	ID, Title string
	MinXP     int
}

type progressionStarterAchievement struct {
	ID, Name, Description   string
	Metric                  ProgressionMetric
	SubjectID, SubjectLabel string
	Target                  int
}

func progressionStarterLevels(locale string) []progressionStarterLevel {
	if normalizeStarterLocale(locale) == "en-GB" {
		return []progressionStarterLevel{{"recruit", "Recruit", 0}, {"regular", "Regular", 100}, {"veteran", "Veteran", 500}, {"elite", "Elite", 1500}, {"legend", "Legend", 5000}}
	}
	return []progressionStarterLevel{{"recruit", "Новобранец", 0}, {"regular", "Завсегдатай", 100}, {"veteran", "Ветеран", 500}, {"elite", "Элита", 1500}, {"legend", "Легенда", 5000}}
}

func progressionStarterAchievements(locale string) []progressionStarterAchievement {
	if normalizeStarterLocale(locale) == "en-GB" {
		return []progressionStarterAchievement{
			{"achievement_first_message", "First contact", "Send your first chat message.", ProgressionMetricMessageCount, "", "", 1},
			{"achievement_intel_officer", "Intel Officer", "Receive five Intel awards.", ProgressionMetricAwardCount, "intel", "Intel", 5},
			{"achievement_spotter", "Spotter", "Receive ten Spotter awards.", ProgressionMetricAwardCount, "spotter", "Spotter", 10},
			{"achievement_comedian", "Comedian", "Receive ten Joke awards.", ProgressionMetricAwardCount, "joke", "Joke", 10},
			{"achievement_meme_lord", "Meme Lord", "Receive ten Meme awards.", ProgressionMetricAwardCount, "meme", "Meme", 10},
			{"achievement_veteran", "Veteran", "Participate in ten streams.", ProgressionMetricSessionCount, "", "", 10},
			{"achievement_clutch", "Clutch", "Receive a Clutch Help award.", ProgressionMetricAwardCount, "clutch", "Clutch Help", 1},
			{"achievement_contractor", "Contractor", "Win a viewer contract.", ProgressionMetricContractWinCount, "", "", 1},
		}
	}
	return []progressionStarterAchievement{
		{"achievement_first_message", "Первый контакт", "Отправьте первое сообщение в чате.", ProgressionMetricMessageCount, "", "", 1},
		{"achievement_intel_officer", "Офицер разведки", "Получите пять наград «Информация».", ProgressionMetricAwardCount, "intel", "Информация", 5},
		{"achievement_spotter", "Зоркий глаз", "Получите десять наград «Зоркий глаз».", ProgressionMetricAwardCount, "spotter", "Зоркий глаз", 10},
		{"achievement_comedian", "Комик", "Получите десять наград «Шутка».", ProgressionMetricAwardCount, "joke", "Шутка", 10},
		{"achievement_meme_lord", "Повелитель мемов", "Получите десять наград «Мем».", ProgressionMetricAwardCount, "meme", "Мем", 10},
		{"achievement_veteran", "Ветеран эфиров", "Участвуйте в десяти эфирах.", ProgressionMetricSessionCount, "", "", 10},
		{"achievement_clutch", "Решающая помощь", "Получите награду «Решающая помощь».", ProgressionMetricAwardCount, "clutch", "Решающая помощь", 1},
		{"achievement_contractor", "Контрактник", "Выиграйте контракт зрителей.", ProgressionMetricContractWinCount, "", "", 1},
	}
}

func (s *Store) progressionBootstrapStateLocked() (string, error) {
	var state string
	err := s.db.QueryRow(`SELECT value FROM store_bootstrap WHERE key = ?`, progressionBootstrapKey).Scan(&state)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", errors.Errorf("read progression bootstrap state: %w", err)
	}
	return state, nil
}

// ensureProgressionBootstrapLocked creates the editable initial catalog once.
// A pending locale is durable before catalog writes so retries never translate it.
func (s *Store) ensureProgressionBootstrapLocked(locale string) error {
	state, err := s.progressionBootstrapStateLocked()
	if err != nil {
		return err
	}
	if state == "1" {
		return nil
	}
	if state == "" {
		state = starterCatalogPendingPrefix + normalizeStarterLocale(locale)
	}
	if !strings.HasPrefix(state, starterCatalogPendingPrefix) {
		return errors.Errorf("invalid progression bootstrap state %q", state)
	}
	locale = strings.TrimPrefix(state, starterCatalogPendingPrefix)
	now := time.Now()
	tx, err := s.db.Begin()
	if err != nil {
		return errors.Errorf("begin progression bootstrap: %w", err)
	}
	for _, level := range progressionStarterLevels(locale) {
		if _, err := tx.Exec(`INSERT INTO progression_levels (id, title, min_xp, announce, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?) ON CONFLICT(id) DO NOTHING`, level.ID, level.Title, level.MinXP, formatTime(now), formatTime(now)); err != nil {
			return rollbackStarterCatalogTransaction(tx, errors.Errorf("insert starter progression level %q: %w", level.ID, err))
		}
	}
	for _, achievement := range progressionStarterAchievements(locale) {
		if _, err := tx.Exec(`INSERT INTO achievement_definitions (id, name, description, enabled, secret, announce, active_revision, deleted_at, created_at, updated_at) VALUES (?, ?, ?, 1, 0, 1, 1, NULL, ?, ?) ON CONFLICT(id) DO NOTHING`, achievement.ID, achievement.Name, achievement.Description, formatTime(now), formatTime(now)); err != nil {
			return rollbackStarterCatalogTransaction(tx, errors.Errorf("insert starter achievement %q: %w", achievement.ID, err))
		}
		if _, err := tx.Exec(`INSERT INTO achievement_revisions (achievement_id, revision, metric, subject_id, subject_label, target, repeatable, created_at) VALUES (?, 1, ?, ?, ?, ?, 0, ?) ON CONFLICT(achievement_id, revision) DO NOTHING`, achievement.ID, achievement.Metric, nullString(achievement.SubjectID), achievement.SubjectLabel, achievement.Target, formatTime(now)); err != nil {
			return rollbackStarterCatalogTransaction(tx, errors.Errorf("insert starter achievement revision %q: %w", achievement.ID, err))
		}
	}
	if _, err := tx.Exec(`INSERT INTO progression_alert_settings (id, achievement_enabled, level_enabled, layout, sound, sound_volume, duration_ms, created_at, updated_at) VALUES (1, 0, 0, 'card', '', 70, 5000, ?, ?) ON CONFLICT(id) DO NOTHING`, formatTime(now), formatTime(now)); err != nil {
		return rollbackStarterCatalogTransaction(tx, errors.Errorf("insert progression alert settings: %w", err))
	}
	if _, err := tx.Exec(`INSERT INTO progression_reconciliation (id, bootstrap_state, requested_generation, completed_generation, status, last_viewer_id, created_at, updated_at) VALUES (1, 'complete', 1, 0, 'pending', NULL, ?, ?) ON CONFLICT(id) DO NOTHING`, formatTime(now), formatTime(now)); err != nil {
		return rollbackStarterCatalogTransaction(tx, errors.Errorf("insert progression reconciliation state: %w", err))
	}
	if _, err := tx.Exec(`INSERT INTO store_bootstrap (key, value) VALUES (?, '1') ON CONFLICT(key) DO UPDATE SET value = excluded.value`, progressionBootstrapKey); err != nil {
		return rollbackStarterCatalogTransaction(tx, errors.Errorf("complete progression bootstrap: %w", err))
	}
	if err := tx.Commit(); err != nil {
		return errors.Errorf("commit progression bootstrap: %w", err)
	}
	return nil
}
