package store

import (
	"database/sql"
	"strings"

	"github.com/google/uuid"
	"github.com/muonsoft/errors"
)

// ListAwards returns all award types ordered by name.
func (s *Store) ListAwards() ([]AwardType, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	rows, err := s.db.Query(`
		SELECT id, name, points, splash_template, sound, duration_ms, image_asset, sound_file
		FROM award_types
		ORDER BY name`)
	if err != nil {
		return nil, errors.Errorf("list awards: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var awards []AwardType
	for rows.Next() {
		award, scanErr := scanAward(rows)
		if scanErr != nil {
			return nil, errors.Errorf("scan award: %w", scanErr)
		}
		awards = append(awards, award)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.Errorf("iterate awards: %w", err)
	}

	return awards, nil
}

// GetAward returns one award type by id.
func (s *Store) GetAward(id string) (*AwardType, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.getAwardLocked(id)
}

func scanAward(scanner interface {
	Scan(dest ...any) error
}) (AwardType, error) {
	var award AwardType
	var imageAsset sql.NullString
	var soundFile sql.NullString

	err := scanner.Scan(
		&award.ID,
		&award.Name,
		&award.Points,
		&award.SplashTemplate,
		&award.Sound,
		&award.DurationMs,
		&imageAsset,
		&soundFile,
	)
	if err != nil {
		return AwardType{}, err
	}

	if imageAsset.Valid {
		award.ImageAsset = imageAsset.String
	}
	if soundFile.Valid {
		award.SoundFile = soundFile.String
	}

	return award, nil
}

type CreateAwardInput struct {
	ID             string
	Name           string
	Points         int
	SplashTemplate string
	Sound          string
	DurationMs     int
}

func validateAwardPoints(points int) error {
	if points < 1 {
		return ErrInvalidPoints
	}

	return nil
}

// CreateAward inserts a new award type.
func (s *Store) CreateAward(input CreateAwardInput) (*AwardType, error) {
	if strings.TrimSpace(input.Name) == "" {
		return nil, errors.New("name is required")
	}
	if err := validateAwardPoints(input.Points); err != nil {
		return nil, err
	}
	if strings.TrimSpace(input.SplashTemplate) == "" {
		return nil, errors.New("splash template is required")
	}
	if err := validateCatalogSound(input.Sound); err != nil {
		return nil, err
	}

	id := strings.TrimSpace(input.ID)
	if id == "" {
		id = uuid.NewString()
	}

	durationMs := normalizeDurationMs(input.DurationMs)

	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.db.Exec(`
		INSERT INTO award_types (id, name, points, splash_template, sound, duration_ms)
		VALUES (?, ?, ?, ?, ?, ?)`,
		id,
		strings.TrimSpace(input.Name),
		input.Points,
		input.SplashTemplate,
		input.Sound,
		durationMs,
	)
	if err != nil {
		return nil, errors.Errorf("insert award: %w", err)
	}

	return s.getAwardLocked(id)
}

type UpdateAwardInput struct {
	ID             string
	Name           string
	Points         int
	SplashTemplate string
	Sound          string
	DurationMs     int
}

// UpdateAward updates an existing award type.
func (s *Store) UpdateAward(input UpdateAwardInput) (*AwardType, error) {
	if strings.TrimSpace(input.ID) == "" {
		return nil, ErrAwardNotFound
	}
	if strings.TrimSpace(input.Name) == "" {
		return nil, errors.New("name is required")
	}
	if err := validateAwardPoints(input.Points); err != nil {
		return nil, err
	}
	if strings.TrimSpace(input.SplashTemplate) == "" {
		return nil, errors.New("splash template is required")
	}
	if err := validateCatalogSound(input.Sound); err != nil {
		return nil, err
	}

	durationMs := normalizeDurationMs(input.DurationMs)

	s.mu.Lock()
	defer s.mu.Unlock()

	if _, err := s.getAwardLocked(input.ID); err != nil {
		return nil, err
	}

	result, err := s.db.Exec(`
		UPDATE award_types
		SET name = ?, points = ?, splash_template = ?, sound = ?, duration_ms = ?
		WHERE id = ?`,
		strings.TrimSpace(input.Name),
		input.Points,
		input.SplashTemplate,
		input.Sound,
		durationMs,
		input.ID,
	)
	if err != nil {
		return nil, errors.Errorf("update award: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return nil, errors.Errorf("rows affected after update award: %w", err)
	}
	if rows == 0 {
		return nil, ErrAwardNotFound
	}

	return s.getAwardLocked(input.ID)
}

// DeleteAward permanently removes an award type.
func (s *Store) DeleteAward(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	result, err := s.db.Exec(`DELETE FROM award_types WHERE id = ?`, id)
	if err != nil {
		return errors.Errorf("delete award: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.Errorf("rows affected after delete award: %w", err)
	}
	if rows == 0 {
		return ErrAwardNotFound
	}

	return nil
}

func (s *Store) getAwardLocked(id string) (*AwardType, error) {
	row := s.db.QueryRow(`
		SELECT id, name, points, splash_template, sound, duration_ms, image_asset, sound_file
		FROM award_types
		WHERE id = ?`, id)

	award, err := scanAward(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrAwardNotFound
	}
	if err != nil {
		return nil, errors.Errorf("get award %q: %w", id, err)
	}

	return &award, nil
}
