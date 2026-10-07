package store

import (
	"strings"

	"github.com/muonsoft/errors"
)

const loreExpertCatalogBootstrapKey = "lore_expert_catalog_initialized"

func loreExpertAwardSeed(locale string) starterAwardSeed {
	name := "Знаток лора"
	if normalizeStarterLocale(locale) == "en-GB" {
		name = "Lore Expert"
	}
	return starterAwardSeed{
		ID: "lore_expert", Name: name, Points: 50,
		SplashTemplate: name + ": {viewer}! +{points}",
		Sound:          "chime", DurationMs: 5000,
	}
}

func (s *Store) ensureLoreExpertCatalogBootstrapLocked() error {
	var state string
	if err := s.db.QueryRow(`SELECT value FROM store_bootstrap WHERE key = ?`, loreExpertCatalogBootstrapKey).Scan(&state); err != nil {
		return errors.Errorf("read lore expert catalog bootstrap state: %w", err)
	}
	if state == "1" {
		return nil
	}
	if !strings.HasPrefix(state, starterCatalogPendingPrefix) {
		return errors.Errorf("invalid lore expert catalog bootstrap state %q", state)
	}

	award := loreExpertAwardSeed(strings.TrimPrefix(state, starterCatalogPendingPrefix))
	tx, err := s.db.Begin()
	if err != nil {
		return errors.Errorf("begin lore expert catalog transaction: %w", err)
	}
	if _, err := tx.Exec(
		`INSERT INTO award_types (id, name, points, splash_template, sound, duration_ms, layout)
		 VALUES (?, ?, ?, ?, ?, ?, 'fullscreen') ON CONFLICT(id) DO NOTHING`,
		award.ID, award.Name, award.Points, award.SplashTemplate, award.Sound, award.DurationMs,
	); err != nil {
		return rollbackStarterCatalogTransaction(tx, errors.Errorf("insert lore expert award: %w", err))
	}
	if _, err := tx.Exec(`UPDATE store_bootstrap SET value = '1' WHERE key = ?`, loreExpertCatalogBootstrapKey); err != nil {
		return rollbackStarterCatalogTransaction(tx, errors.Errorf("complete lore expert catalog bootstrap: %w", err))
	}
	if err := tx.Commit(); err != nil {
		return errors.Errorf("commit lore expert catalog bootstrap: %w", err)
	}
	return nil
}
