package store

import (
	"database/sql"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"github.com/muonsoft/errors"
)

var commandTriggerPattern = regexp.MustCompile(`^[a-z0-9_]{1,32}$`)

var allowedCatalogSounds = map[string]bool{
	"":      true,
	"chime": true,
	"ping":  true,
	"soft":  true,
	"alert": true,
}

const defaultCatalogDurationMs = 5000

func normalizeCommandTrigger(trigger string) string {
	return strings.TrimSpace(strings.ToLower(trigger))
}

func validateCommandTrigger(trigger string) error {
	if trigger == "" {
		return ErrInvalidTrigger
	}
	if strings.Contains(trigger, "!") {
		return ErrInvalidTrigger
	}
	if strings.ContainsAny(trigger, " \t") {
		return ErrInvalidTrigger
	}
	if !commandTriggerPattern.MatchString(trigger) {
		return ErrInvalidTrigger
	}

	return nil
}

func validateCatalogSound(sound string) error {
	if !allowedCatalogSounds[sound] {
		return errors.Errorf("invalid sound %q", sound)
	}

	return nil
}

func normalizeDurationMs(durationMs int) int {
	if durationMs < 1 {
		return defaultCatalogDurationMs
	}

	return durationMs
}

func isUniqueConstraint(err error) bool {
	return strings.Contains(strings.ToLower(err.Error()), "unique")
}

func scanCommand(scanner interface {
	Scan(dest ...any) error
}) (Command, error) {
	var cmd Command
	var enabled int
	var imageAsset sql.NullString
	var soundFile sql.NullString

	err := scanner.Scan(
		&cmd.ID,
		&cmd.Trigger,
		&enabled,
		&cmd.CooldownSeconds,
		&cmd.SplashTemplate,
		&cmd.Sound,
		&cmd.DurationMs,
		&imageAsset,
		&soundFile,
		&cmd.SoundVolume,
		&cmd.Layout,
		&cmd.ImageFit,
		&cmd.ImageSizePct,
	)
	if err != nil {
		return Command{}, err
	}

	cmd.Enabled = enabled != 0
	if imageAsset.Valid {
		cmd.ImageAsset = imageAsset.String
	}
	if soundFile.Valid {
		cmd.SoundFile = soundFile.String
	}
	cmd.SoundVolume = NormalizeCatalogSoundVolume(cmd.SoundVolume)
	cmd.Layout = NormalizeCatalogLayout(cmd.Layout)
	cmd.ImageFit = NormalizeCatalogImageFit(cmd.ImageFit)
	cmd.ImageSizePct = NormalizeCatalogImageSizePct(cmd.ImageSizePct)

	return cmd, nil
}

// ListCommands returns all commands ordered by trigger.
func (s *Store) ListCommands() ([]Command, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	rows, err := s.db.Query(`
		SELECT id, trigger, enabled, cooldown_seconds, splash_template, sound, duration_ms, image_asset, sound_file, sound_volume, layout, image_fit, image_size_pct
		FROM commands
		ORDER BY trigger`)
	if err != nil {
		return nil, errors.Errorf("list commands: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var commands []Command
	for rows.Next() {
		cmd, scanErr := scanCommand(rows)
		if scanErr != nil {
			return nil, errors.Errorf("scan command: %w", scanErr)
		}
		commands = append(commands, cmd)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.Errorf("iterate commands: %w", err)
	}

	return commands, nil
}

// GetCommand returns one command by id.
func (s *Store) GetCommand(id string) (*Command, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	row := s.db.QueryRow(`
		SELECT id, trigger, enabled, cooldown_seconds, splash_template, sound, duration_ms, image_asset, sound_file, sound_volume, layout, image_fit, image_size_pct
		FROM commands
		WHERE id = ?`, id)

	cmd, err := scanCommand(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrCommandNotFound
	}
	if err != nil {
		return nil, errors.Errorf("get command %q: %w", id, err)
	}

	return &cmd, nil
}

// CreateCommandInput is the payload for CreateCommand.
type CreateCommandInput struct {
	ID              string
	Trigger         string
	Enabled         bool
	CooldownSeconds int
	SplashTemplate  string
	Sound           string
	DurationMs      int
	ImageAsset      string
	SoundFile       string
	SoundVolume     int
	Layout          string
	ImageFit        string
	ImageSizePct    int
}

// CreateCommand inserts a new command.
func (s *Store) CreateCommand(input CreateCommandInput) (*Command, error) {
	trigger := normalizeCommandTrigger(input.Trigger)
	if err := validateCommandTrigger(trigger); err != nil {
		return nil, err
	}
	if strings.TrimSpace(input.SplashTemplate) == "" {
		return nil, errors.New("splash template is required")
	}
	if input.CooldownSeconds < 0 {
		return nil, errors.New("cooldown must be non-negative")
	}
	if err := validateCatalogSound(input.Sound); err != nil {
		return nil, err
	}
	if fields := validateCommandMediaFields(
		input.ImageAsset, input.SoundFile, input.SoundVolume, input.ImageSizePct, input.Layout, input.ImageFit,
	); len(fields) > 0 {
		return nil, catalogMediaValidationError(fields)
	}

	id := strings.TrimSpace(input.ID)
	if id == "" {
		id = uuid.NewString()
	}

	durationMs := normalizeDurationMs(input.DurationMs)
	enabled := 0
	if input.Enabled {
		enabled = 1
	}
	imageAsset := strings.TrimSpace(input.ImageAsset)
	soundFile := strings.TrimSpace(input.SoundFile)
	soundVolume := NormalizeCatalogSoundVolume(input.SoundVolume)
	layout := NormalizeCatalogLayout(input.Layout)
	imageFit := NormalizeCatalogImageFit(input.ImageFit)
	imageSizePct := NormalizeCatalogImageSizePct(input.ImageSizePct)

	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.db.Exec(`
		INSERT INTO commands (
			id, trigger, enabled, cooldown_seconds, splash_template, sound, duration_ms,
			image_asset, sound_file, sound_volume, layout, image_fit, image_size_pct
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id,
		trigger,
		enabled,
		input.CooldownSeconds,
		input.SplashTemplate,
		input.Sound,
		durationMs,
		nullString(imageAsset),
		nullString(soundFile),
		soundVolume,
		layout,
		imageFit,
		imageSizePct,
	)
	if err != nil {
		if isUniqueConstraint(err) {
			return nil, ErrDuplicateTrigger
		}
		return nil, errors.Errorf("insert command: %w", err)
	}

	return s.getCommandLocked(id)
}

// UpdateCommandInput is the payload for UpdateCommand.
type UpdateCommandInput struct {
	ID              string
	Trigger         string
	Enabled         bool
	CooldownSeconds int
	SplashTemplate  string
	Sound           string
	DurationMs      int
	ImageAsset      string
	SoundFile       string
	SoundVolume     int
	Layout          string
	ImageFit        string
	ImageSizePct    int
}

// UpdateCommand updates an existing command.
func (s *Store) UpdateCommand(input UpdateCommandInput) (*Command, error) {
	if strings.TrimSpace(input.ID) == "" {
		return nil, ErrCommandNotFound
	}

	trigger := normalizeCommandTrigger(input.Trigger)
	if err := validateCommandTrigger(trigger); err != nil {
		return nil, err
	}
	if strings.TrimSpace(input.SplashTemplate) == "" {
		return nil, errors.New("splash template is required")
	}
	if input.CooldownSeconds < 0 {
		return nil, errors.New("cooldown must be non-negative")
	}
	if err := validateCatalogSound(input.Sound); err != nil {
		return nil, err
	}
	if fields := validateCommandMediaFields(
		input.ImageAsset, input.SoundFile, input.SoundVolume, input.ImageSizePct, input.Layout, input.ImageFit,
	); len(fields) > 0 {
		return nil, catalogMediaValidationError(fields)
	}

	durationMs := normalizeDurationMs(input.DurationMs)
	enabled := 0
	if input.Enabled {
		enabled = 1
	}
	imageAsset := strings.TrimSpace(input.ImageAsset)
	soundFile := strings.TrimSpace(input.SoundFile)
	soundVolume := NormalizeCatalogSoundVolume(input.SoundVolume)
	layout := NormalizeCatalogLayout(input.Layout)
	imageFit := NormalizeCatalogImageFit(input.ImageFit)
	imageSizePct := NormalizeCatalogImageSizePct(input.ImageSizePct)

	s.mu.Lock()
	defer s.mu.Unlock()

	if _, err := s.getCommandLocked(input.ID); err != nil {
		return nil, err
	}

	result, err := s.db.Exec(`
		UPDATE commands
		SET trigger = ?, enabled = ?, cooldown_seconds = ?, splash_template = ?, sound = ?, duration_ms = ?,
		    image_asset = ?, sound_file = ?, sound_volume = ?, layout = ?, image_fit = ?, image_size_pct = ?
		WHERE id = ?`,
		trigger,
		enabled,
		input.CooldownSeconds,
		input.SplashTemplate,
		input.Sound,
		durationMs,
		nullString(imageAsset),
		nullString(soundFile),
		soundVolume,
		layout,
		imageFit,
		imageSizePct,
		input.ID,
	)
	if err != nil {
		if isUniqueConstraint(err) {
			return nil, ErrDuplicateTrigger
		}
		return nil, errors.Errorf("update command: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return nil, errors.Errorf("rows affected after update command: %w", err)
	}
	if rows == 0 {
		return nil, ErrCommandNotFound
	}

	return s.getCommandLocked(input.ID)
}

// DeleteCommand permanently removes a command.
func (s *Store) DeleteCommand(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	result, err := s.db.Exec(`DELETE FROM commands WHERE id = ?`, id)
	if err != nil {
		return errors.Errorf("delete command: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.Errorf("rows affected after delete command: %w", err)
	}
	if rows == 0 {
		return ErrCommandNotFound
	}

	return nil
}

func (s *Store) getCommandLocked(id string) (*Command, error) {
	row := s.db.QueryRow(`
		SELECT id, trigger, enabled, cooldown_seconds, splash_template, sound, duration_ms, image_asset, sound_file, sound_volume, layout, image_fit, image_size_pct
		FROM commands
		WHERE id = ?`, id)

	cmd, err := scanCommand(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrCommandNotFound
	}
	if err != nil {
		return nil, errors.Errorf("get command %q: %w", id, err)
	}

	return &cmd, nil
}
