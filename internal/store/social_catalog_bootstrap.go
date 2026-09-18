package store

import (
	"database/sql"
	"strings"
	"time"

	"github.com/muonsoft/errors"
)

const socialCatalogBootstrapKey = "social_catalog_initialized"

type socialCommandSeed struct {
	ID              string
	Trigger         string
	Action          string
	AwardID         string
	Points          int
	CooldownSeconds int
}

type socialAchievementSeed struct {
	ID, Name, Description string
	Metric                ProgressionMetric
	SubjectID             string
	SubjectLabel          string
	Target                int
}

func viewerLikeAwardSeed(locale string) starterAwardSeed {
	if normalizeStarterLocale(locale) == "en-GB" {
		return starterAwardSeed{
			ID:             "viewer_like",
			Name:           "Viewer Like",
			Points:         5,
			SplashTemplate: "Viewer Like for {viewer}! +{points}",
			Sound:          "soft",
			DurationMs:     5000,
		}
	}
	return starterAwardSeed{
		ID:             "viewer_like",
		Name:           "Лайк зрителя",
		Points:         5,
		SplashTemplate: "Лайк зрителя для {viewer}! +{points}",
		Sound:          "soft",
		DurationMs:     5000,
	}
}

func socialAchievementsForLocale(locale string) []socialAchievementSeed {
	if normalizeStarterLocale(locale) == "en-GB" {
		return []socialAchievementSeed{
			{"cheerleader", "Cheerleader", "Fire the like command 10 times.", ProgressionMetricCommandCount, "like", "Like", 10},
			{"chat_favorite", "Chat Favorite", "Receive 10 viewer like awards.", ProgressionMetricAwardCount, "viewer_like", "Viewer Like", 10},
			{"copilot", "Copilot", "Fire the buff command 10 times.", ProgressionMetricCommandCount, "buff", "Buff", 10},
		}
	}
	return []socialAchievementSeed{
		{"cheerleader", "Болельщик", "Успешно используйте команду лайка 10 раз.", ProgressionMetricCommandCount, "like", "Лайк", 10},
		{"chat_favorite", "Любимец чата", "Получите 10 наград «Лайк зрителя».", ProgressionMetricAwardCount, "viewer_like", "Лайк зрителя", 10},
		{"copilot", "Второй пилот", "Успешно используйте команду баффа 10 раз.", ProgressionMetricCommandCount, "buff", "Бафф", 10},
	}
}

func (s *Store) socialCatalogBootstrapStateLocked() (string, error) {
	var value string
	err := s.db.QueryRow(`SELECT value FROM store_bootstrap WHERE key = ?`, socialCatalogBootstrapKey).Scan(&value)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		if isMissingTableError(err) {
			return "", nil
		}
		return "", errors.Errorf("read social catalog bootstrap state: %w", err)
	}
	return value, nil
}

func (s *Store) ensureSocialCatalogBootstrapLocked() error {
	state, err := s.socialCatalogBootstrapStateLocked()
	if err != nil {
		return err
	}
	if state == "1" {
		return nil
	}
	if state == "" {
		tx, err := s.db.Begin()
		if err != nil {
			return errors.Errorf("begin social catalog adoption: %w", err)
		}
		if _, err := tx.Exec(
			`INSERT INTO store_bootstrap (key, value) VALUES (?, '1') ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
			socialCatalogBootstrapKey,
		); err != nil {
			return rollbackStarterCatalogTransaction(tx, errors.Errorf("adopt social catalog bootstrap: %w", err))
		}
		if err := tx.Commit(); err != nil {
			return errors.Errorf("commit social catalog adoption: %w", err)
		}
		return nil
	}
	if !strings.HasPrefix(state, starterCatalogPendingPrefix) {
		return errors.Errorf("invalid social catalog bootstrap state %q", state)
	}
	locale := strings.TrimPrefix(state, starterCatalogPendingPrefix)
	if err := s.applySocialCatalogLocked(locale); err != nil {
		return err
	}
	return nil
}

func commandTriggerTakenTx(tx *sql.Tx, trigger string) (bool, error) {
	var id string
	err := tx.QueryRow(`SELECT id FROM commands WHERE trigger = ?`, trigger).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, errors.Errorf("check command trigger %q: %w", trigger, err)
	}
	return true, nil
}

func (s *Store) applySocialCatalogLocked(locale string) error {
	award := viewerLikeAwardSeed(locale)
	now := time.Now()
	tx, err := s.db.Begin()
	if err != nil {
		return errors.Errorf("begin social catalog transaction: %w", err)
	}

	_, err = tx.Exec(
		`INSERT INTO award_types (id, name, points, splash_template, sound, duration_ms)
		 SELECT ?, ?, ?, ?, ?, ?
		 WHERE NOT EXISTS (SELECT 1 FROM award_types WHERE id = ?)`,
		award.ID, award.Name, award.Points, award.SplashTemplate, award.Sound, award.DurationMs, award.ID,
	)
	if err != nil {
		return rollbackStarterCatalogTransaction(tx, errors.Errorf("insert viewer_like award: %w", err))
	}

	socialCommands := []socialCommandSeed{
		{ID: "like", Trigger: "like", Action: CommandActionLike, AwardID: "viewer_like", CooldownSeconds: 10},
		{ID: "buff", Trigger: "buff", Action: CommandActionBuff, Points: 5, CooldownSeconds: 10},
	}
	for _, cmd := range socialCommands {
		taken, err := commandTriggerTakenTx(tx, cmd.Trigger)
		if err != nil {
			return rollbackStarterCatalogTransaction(tx, err)
		}
		if taken {
			continue
		}
		var points any
		if cmd.Points > 0 {
			points = cmd.Points
		}
		var awardID any
		if strings.TrimSpace(cmd.AwardID) != "" {
			awardID = strings.TrimSpace(cmd.AwardID)
		}
		_, err = tx.Exec(
			`INSERT INTO commands (
				id, action, trigger, enabled, cooldown_seconds, splash_template, sound, duration_ms,
				sound_volume, layout, image_fit, image_size_pct, points, award_id
			) VALUES (?, ?, ?, 1, ?, '', '', 5000, 70, 'card', 'contain', 100, ?, ?)
			ON CONFLICT(id) DO NOTHING`,
			cmd.ID,
			cmd.Action,
			cmd.Trigger,
			cmd.CooldownSeconds,
			points,
			awardID,
		)
		if err != nil {
			return rollbackStarterCatalogTransaction(tx, errors.Errorf("insert social command %q: %w", cmd.ID, err))
		}
	}

	for _, achievement := range socialAchievementsForLocale(locale) {
		if _, err := tx.Exec(
			`INSERT INTO achievement_definitions (id, name, description, enabled, secret, announce, active_revision, deleted_at, created_at, updated_at)
			 VALUES (?, ?, ?, 1, 0, 1, 1, NULL, ?, ?)
			 ON CONFLICT(id) DO NOTHING`,
			achievement.ID, achievement.Name, achievement.Description, formatTime(now), formatTime(now),
		); err != nil {
			return rollbackStarterCatalogTransaction(tx, errors.Errorf("insert social achievement %q: %w", achievement.ID, err))
		}
		if _, err := tx.Exec(
			`INSERT INTO achievement_revisions (achievement_id, revision, metric, subject_id, subject_label, target, repeatable, created_at)
			 VALUES (?, 1, ?, ?, ?, ?, 0, ?)
			 ON CONFLICT(achievement_id, revision) DO NOTHING`,
			achievement.ID, achievement.Metric, nullString(achievement.SubjectID), achievement.SubjectLabel, achievement.Target, formatTime(now),
		); err != nil {
			return rollbackStarterCatalogTransaction(tx, errors.Errorf("insert social achievement revision %q: %w", achievement.ID, err))
		}
	}

	if _, err := tx.Exec(
		`INSERT INTO store_bootstrap (key, value) VALUES (?, '1') ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		socialCatalogBootstrapKey,
	); err != nil {
		return rollbackStarterCatalogTransaction(tx, errors.Errorf("complete social catalog bootstrap: %w", err))
	}

	if err := tx.Commit(); err != nil {
		return errors.Errorf("commit social catalog bootstrap: %w", err)
	}
	return nil
}
