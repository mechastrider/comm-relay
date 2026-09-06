package store

import (
	"database/sql"
	"strings"

	"github.com/muonsoft/errors"
)

const starterCatalogPendingPrefix = "pending:"

func currentGooseVersion(db *sql.DB) (int, error) {
	var version sql.NullInt64
	err := db.QueryRow(`SELECT MAX(version_id) FROM goose_db_version WHERE is_applied = 1`).Scan(&version)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, nil
		}
		if isMissingTableError(err) {
			return 0, nil
		}
		return 0, errors.Errorf("read goose version: %w", err)
	}
	if !version.Valid {
		return 0, nil
	}

	return int(version.Int64), nil
}

func isMissingTableError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "no such table") || strings.Contains(msg, "does not exist")
}

func prepareStarterCatalogBootstrap(db *sql.DB, gooseVersion int, locale string) error {
	tx, err := db.Begin()
	if err != nil {
		return errors.Errorf("begin starter catalog bootstrap preparation: %w", err)
	}

	if _, err := tx.Exec(`CREATE TABLE IF NOT EXISTS store_bootstrap (
		key TEXT NOT NULL PRIMARY KEY,
		value TEXT NOT NULL
	)`); err != nil {
		return rollbackStarterCatalogTransaction(tx, errors.Errorf("prepare store bootstrap table: %w", err))
	}

	state := "1"
	if gooseVersion == 0 {
		state = starterCatalogPendingPrefix + normalizeStarterLocale(locale)
	}
	if _, err := tx.Exec(
		`INSERT INTO store_bootstrap (key, value) VALUES (?, ?)
		 ON CONFLICT(key) DO NOTHING`,
		starterCatalogBootstrapKey,
		state,
	); err != nil {
		return rollbackStarterCatalogTransaction(tx, errors.Errorf("prepare starter catalog bootstrap state: %w", err))
	}

	if err := tx.Commit(); err != nil {
		return errors.Errorf("commit starter catalog bootstrap preparation: %w", err)
	}

	return nil
}

func rollbackStarterCatalogTransaction(tx *sql.Tx, cause error) error {
	rollbackErr := tx.Rollback()
	if rollbackErr != nil {
		return errors.Errorf("%w (rollback starter catalog transaction: %v)", cause, rollbackErr)
	}

	return cause
}

func (s *Store) starterCatalogStateLocked() (string, error) {
	var value string
	err := s.db.QueryRow(
		`SELECT value FROM store_bootstrap WHERE key = ?`,
		starterCatalogBootstrapKey,
	).Scan(&value)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		if isMissingTableError(err) {
			return "", nil
		}
		return "", errors.Errorf("read starter catalog bootstrap state: %w", err)
	}

	return value, nil
}

func (s *Store) setStarterCatalogInitializedLocked(tx *sql.Tx) error {
	_, err := tx.Exec(
		`INSERT INTO store_bootstrap (key, value) VALUES (?, '1')
		 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		starterCatalogBootstrapKey,
	)
	if err != nil {
		return errors.Errorf("set starter catalog bootstrap flag: %w", err)
	}

	return nil
}

func (s *Store) ensureStarterCatalogLocked() error {
	state, err := s.starterCatalogStateLocked()
	if err != nil {
		return err
	}
	if state == "1" {
		return nil
	}

	if state == "" {
		tx, err := s.db.Begin()
		if err != nil {
			return errors.Errorf("begin missing starter catalog state adoption: %w", err)
		}
		if err := s.setStarterCatalogInitializedLocked(tx); err != nil {
			return rollbackStarterCatalogTransaction(tx, err)
		}
		if err := tx.Commit(); err != nil {
			return errors.Errorf("commit missing starter catalog state adoption: %w", err)
		}
		return nil
	}

	if !strings.HasPrefix(state, starterCatalogPendingPrefix) {
		return errors.Errorf("invalid starter catalog bootstrap state %q", state)
	}

	locale := strings.TrimPrefix(state, starterCatalogPendingPrefix)
	if err := s.applyStarterCatalogLocked(locale); err != nil {
		return err
	}

	return nil
}

func (s *Store) applyStarterCatalogLocked(locale string) error {
	tx, err := s.db.Begin()
	if err != nil {
		return errors.Errorf("begin starter catalog transaction: %w", err)
	}

	for _, cmd := range starterCommandsForLocale(locale) {
		enabled := 0
		if cmd.Enabled {
			enabled = 1
		}
		_, err := tx.Exec(
			`INSERT INTO commands (
				id, trigger, enabled, cooldown_seconds, splash_template, sound, duration_ms
			) VALUES (?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(id) DO UPDATE SET splash_template = excluded.splash_template`,
			cmd.ID,
			cmd.Trigger,
			enabled,
			cmd.CooldownSeconds,
			cmd.SplashTemplate,
			cmd.Sound,
			cmd.DurationMs,
		)
		if err != nil {
			return rollbackStarterCatalogTransaction(
				tx,
				errors.Errorf("upsert starter command %q: %w", cmd.ID, err),
			)
		}
	}

	for _, award := range starterAwardsForLocale(locale) {
		_, err := tx.Exec(
			`INSERT INTO award_types (
				id, name, points, splash_template, sound, duration_ms
			) VALUES (?, ?, ?, ?, ?, ?)
			ON CONFLICT(id) DO UPDATE SET
				name = excluded.name,
				points = excluded.points,
				splash_template = excluded.splash_template,
				sound = excluded.sound,
				duration_ms = excluded.duration_ms`,
			award.ID,
			award.Name,
			award.Points,
			award.SplashTemplate,
			award.Sound,
			award.DurationMs,
		)
		if err != nil {
			return rollbackStarterCatalogTransaction(
				tx,
				errors.Errorf("upsert starter award %q: %w", award.ID, err),
			)
		}
	}

	if err := s.setStarterCatalogInitializedLocked(tx); err != nil {
		return rollbackStarterCatalogTransaction(tx, err)
	}

	if err := tx.Commit(); err != nil {
		return errors.Errorf("commit starter catalog: %w", err)
	}

	return nil
}
