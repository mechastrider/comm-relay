package store

import (
	"database/sql"
	"strings"
	"unicode/utf8"

	"github.com/muonsoft/errors"
)

var fixedGreetingKinds = []GreetingKind{GreetingNewViewer, GreetingReturningViewer}

func starterGreetingTemplate(locale string, kind GreetingKind) string {
	if normalizeStarterLocale(locale) != "en-GB" {
		if kind == GreetingReturningViewer {
			return "С возвращением, {viewer}!"
		}
		return "Добро пожаловать, {viewer}!"
	}
	if kind == GreetingReturningViewer {
		return "Welcome back, {viewer}!"
	}
	return "Welcome, {viewer}!"
}

func (s *Store) ensureGreetingDefinitionsLocked(locale string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	tx, err := s.db.Begin()
	if err != nil {
		return errors.Errorf("begin greeting bootstrap: %w", err)
	}
	for _, kind := range fixedGreetingKinds {
		if _, err := tx.Exec(`INSERT INTO greeting_definitions (
			id, enabled, splash_template, sound, duration_ms, sound_volume, layout, image_fit, image_size_pct
		) VALUES (?, 0, ?, '', 5000, 70, 'card', 'contain', 100)
		ON CONFLICT(id) DO NOTHING`, kind, starterGreetingTemplate(locale, kind)); err != nil {
			return rollbackStarterCatalogTransaction(tx, errors.Errorf("insert greeting definition %q: %w", kind, err))
		}
	}
	if err := tx.Commit(); err != nil {
		return errors.Errorf("commit greeting bootstrap: %w", err)
	}
	return nil
}

func scanGreeting(scanner interface{ Scan(dest ...any) error }) (Greeting, error) {
	var greeting Greeting
	var enabled int
	var imageAsset, soundFile sql.NullString
	if err := scanner.Scan(&greeting.ID, &enabled, &greeting.SplashTemplate, &greeting.Sound, &greeting.DurationMs,
		&imageAsset, &soundFile, &greeting.SoundVolume, &greeting.Layout, &greeting.ImageFit, &greeting.ImageSizePct); err != nil {
		return Greeting{}, err
	}
	greeting.Enabled = enabled != 0
	if imageAsset.Valid {
		greeting.ImageAsset = imageAsset.String
	}
	if soundFile.Valid {
		greeting.SoundFile = soundFile.String
	}
	greeting.SoundVolume = NormalizeCatalogSoundVolume(greeting.SoundVolume)
	greeting.Layout = NormalizeCatalogLayout(greeting.Layout)
	greeting.ImageFit = NormalizeCatalogImageFit(greeting.ImageFit)
	greeting.ImageSizePct = NormalizeCatalogImageSizePct(greeting.ImageSizePct)
	return greeting, nil
}

const greetingSelectColumns = `id, enabled, splash_template, sound, duration_ms, image_asset, sound_file, sound_volume, layout, image_fit, image_size_pct`

// ListGreetings returns the two reserved definitions in stable product order.
func (s *Store) ListGreetings() ([]Greeting, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rows, err := s.db.Query(`SELECT ` + greetingSelectColumns + ` FROM greeting_definitions
		ORDER BY CASE id WHEN 'new_viewer' THEN 1 WHEN 'returning_viewer' THEN 2 ELSE 3 END`)
	if err != nil {
		return nil, errors.Errorf("list greeting definitions: %w", err)
	}
	defer func() { _ = rows.Close() }()
	greetings := make([]Greeting, 0, 2)
	for rows.Next() {
		greeting, err := scanGreeting(rows)
		if err != nil {
			return nil, errors.Errorf("scan greeting definition: %w", err)
		}
		greetings = append(greetings, greeting)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.Errorf("iterate greeting definitions: %w", err)
	}
	if len(greetings) != len(fixedGreetingKinds) {
		return nil, errors.New("greeting definitions are incomplete")
	}
	return greetings, nil
}

// GetGreeting returns one reserved definition.
func (s *Store) GetGreeting(kind GreetingKind) (*Greeting, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.getGreetingLocked(kind)
}

func (s *Store) getGreetingLocked(kind GreetingKind) (*Greeting, error) {
	if !validGreetingKind(kind) {
		return nil, ErrGreetingNotFound
	}
	greeting, err := scanGreeting(s.db.QueryRow(`SELECT `+greetingSelectColumns+` FROM greeting_definitions WHERE id = ?`, kind))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrGreetingNotFound
	}
	if err != nil {
		return nil, errors.Errorf("get greeting definition %q: %w", kind, err)
	}
	return &greeting, nil
}

func validGreetingKind(kind GreetingKind) bool {
	return kind == GreetingNewViewer || kind == GreetingReturningViewer
}

// ValidateGreetingPresentation checks the bounded presentation fields for an
// unsaved greeting draft without touching persistent state.
func ValidateGreetingPresentation(greeting Greeting) error {
	if err := validateCatalogSound(greeting.Sound); err != nil {
		return err
	}
	if fields := validateCommandMediaFields(greeting.ImageAsset, greeting.SoundFile, greeting.SoundVolume, greeting.ImageSizePct, greeting.Layout, greeting.ImageFit); len(fields) > 0 {
		return catalogMediaValidationError(fields)
	}
	return nil
}

// UpdateGreeting updates complete presentation fields for a reserved definition.
func (s *Store) UpdateGreeting(input Greeting) (*Greeting, error) {
	if !validGreetingKind(input.ID) {
		return nil, ErrGreetingNotFound
	}
	if strings.TrimSpace(input.SplashTemplate) == "" {
		return nil, errors.New("splash template is required")
	}
	if utf8.RuneCountInString(input.SplashTemplate) > 500 {
		return nil, errors.New("splash template must not exceed 500 characters")
	}
	if err := ValidateGreetingPresentation(input); err != nil {
		return nil, err
	}
	if input.DurationMs < 1 {
		return nil, errors.New("duration must be positive")
	}
	enabled := 0
	if input.Enabled {
		enabled = 1
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	result, err := s.db.Exec(`UPDATE greeting_definitions SET enabled=?, splash_template=?, sound=?, duration_ms=?, image_asset=?, sound_file=?, sound_volume=?, layout=?, image_fit=?, image_size_pct=? WHERE id=?`,
		enabled, input.SplashTemplate, input.Sound, input.DurationMs, nullString(input.ImageAsset), nullString(input.SoundFile), input.SoundVolume, strings.ToLower(strings.TrimSpace(input.Layout)), strings.ToLower(strings.TrimSpace(input.ImageFit)), input.ImageSizePct, input.ID)
	if err != nil {
		return nil, errors.Errorf("update greeting definition: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return nil, errors.Errorf("inspect greeting definition update: %w", err)
	}
	if affected == 0 {
		return nil, ErrGreetingNotFound
	}
	return s.getGreetingLocked(input.ID)
}
