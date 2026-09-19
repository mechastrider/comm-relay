package store

import (
	"database/sql"
	"strings"
	"time"

	"github.com/muonsoft/errors"
)

const onPointCatalogBootstrapKey = "on_point_catalog_initialized"

// onPointCatalogIntroGooseVersion gates prepare-time pending rows for upgraded databases.
// No matching Goose migration is required for this catalog seed.
const onPointCatalogIntroGooseVersion = 22

func onPointAwardSeed(locale string) starterAwardSeed {
	if normalizeStarterLocale(locale) == "en-GB" {
		return starterAwardSeed{
			ID:             "on_point",
			Name:           "On Point",
			Points:         20,
			SplashTemplate: "On Point: {viewer}! +{points}",
			Sound:          "ping",
			DurationMs:     5000,
		}
	}
	return starterAwardSeed{
		ID:             "on_point",
		Name:           "В точку",
		Points:         20,
		SplashTemplate: "В точку: {viewer}! +{points}",
		Sound:          "ping",
		DurationMs:     5000,
	}
}

func onPointAchievementSeed(locale string) socialAchievementSeed {
	award := onPointAwardSeed(locale)
	if normalizeStarterLocale(locale) == "en-GB" {
		return socialAchievementSeed{
			ID:           "achievement_on_point",
			Name:         "In Sync",
			Description:  "Receive ten On Point awards.",
			Metric:       ProgressionMetricAwardCount,
			SubjectID:    award.ID,
			SubjectLabel: award.Name,
			Target:       10,
		}
	}
	return socialAchievementSeed{
		ID:           "achievement_on_point",
		Name:         "Синхрон",
		Description:  "Получите десять наград «В точку».",
		Metric:       ProgressionMetricAwardCount,
		SubjectID:    award.ID,
		SubjectLabel: award.Name,
		Target:       10,
	}
}

func (s *Store) onPointCatalogBootstrapStateLocked() (string, error) {
	var value string
	err := s.db.QueryRow(`SELECT value FROM store_bootstrap WHERE key = ?`, onPointCatalogBootstrapKey).Scan(&value)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		if isMissingTableError(err) {
			return "", nil
		}
		return "", errors.Errorf("read on-point catalog bootstrap state: %w", err)
	}
	return value, nil
}

func (s *Store) ensureOnPointCatalogBootstrapLocked(locale string) error {
	state, err := s.onPointCatalogBootstrapStateLocked()
	if err != nil {
		return err
	}
	if state == "1" {
		return nil
	}
	if state == "" {
		return s.applyOnPointCatalogLocked(normalizeStarterLocale(locale))
	}
	if !strings.HasPrefix(state, starterCatalogPendingPrefix) {
		return errors.Errorf("invalid on-point catalog bootstrap state %q", state)
	}
	return s.applyOnPointCatalogLocked(strings.TrimPrefix(state, starterCatalogPendingPrefix))
}

func (s *Store) applyOnPointCatalogLocked(locale string) error {
	award := onPointAwardSeed(locale)
	achievement := onPointAchievementSeed(locale)
	now := time.Now()

	tx, err := s.db.Begin()
	if err != nil {
		return errors.Errorf("begin on-point catalog transaction: %w", err)
	}

	_, err = tx.Exec(
		`INSERT INTO award_types (id, name, points, splash_template, sound, duration_ms)
		 SELECT ?, ?, ?, ?, ?, ?
		 WHERE NOT EXISTS (SELECT 1 FROM award_types WHERE id = ?)`,
		award.ID, award.Name, award.Points, award.SplashTemplate, award.Sound, award.DurationMs, award.ID,
	)
	if err != nil {
		return rollbackStarterCatalogTransaction(tx, errors.Errorf("insert on_point award: %w", err))
	}

	if _, err := tx.Exec(
		`INSERT INTO achievement_definitions (id, name, description, enabled, secret, announce, active_revision, deleted_at, created_at, updated_at)
		 VALUES (?, ?, ?, 1, 0, 1, 1, NULL, ?, ?)
		 ON CONFLICT(id) DO NOTHING`,
		achievement.ID, achievement.Name, achievement.Description, formatTime(now), formatTime(now),
	); err != nil {
		return rollbackStarterCatalogTransaction(tx, errors.Errorf("insert on-point achievement definition: %w", err))
	}
	if _, err := tx.Exec(
		`INSERT INTO achievement_revisions (achievement_id, revision, metric, subject_id, subject_label, target, repeatable, created_at)
		 VALUES (?, 1, ?, ?, ?, ?, 0, ?)
		 ON CONFLICT(achievement_id, revision) DO NOTHING`,
		achievement.ID, achievement.Metric, nullString(achievement.SubjectID), achievement.SubjectLabel, achievement.Target, formatTime(now),
	); err != nil {
		return rollbackStarterCatalogTransaction(tx, errors.Errorf("insert on-point achievement revision: %w", err))
	}

	if _, err := tx.Exec(
		`INSERT INTO store_bootstrap (key, value) VALUES (?, '1') ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		onPointCatalogBootstrapKey,
	); err != nil {
		return rollbackStarterCatalogTransaction(tx, errors.Errorf("complete on-point catalog bootstrap: %w", err))
	}

	if err := tx.Commit(); err != nil {
		return errors.Errorf("commit on-point catalog bootstrap: %w", err)
	}
	return nil
}
