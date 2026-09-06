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

// Supported command actions.
const (
	CommandActionAlert           = "alert"
	CommandActionShowLeaderboard = "show_leaderboard"
)

func normalizeCommandAction(action string) (string, error) {
	action = strings.TrimSpace(strings.ToLower(action))
	if action == "" {
		return CommandActionAlert, nil
	}
	switch action {
	case CommandActionAlert, CommandActionShowLeaderboard:
		return action, nil
	default:
		return "", ErrInvalidCommandAction
	}
}

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
		&cmd.Action,
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
	cmd.Action, err = normalizeCommandAction(cmd.Action)
	if err != nil {
		return Command{}, err
	}
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
		SELECT id, action, trigger, enabled, cooldown_seconds, splash_template, sound, duration_ms, image_asset, sound_file, sound_volume, layout, image_fit, image_size_pct
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
		SELECT id, action, trigger, enabled, cooldown_seconds, splash_template, sound, duration_ms, image_asset, sound_file, sound_volume, layout, image_fit, image_size_pct
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
	Action          string
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
	action, err := normalizeCommandAction(input.Action)
	if err != nil {
		return nil, err
	}
	trigger := normalizeCommandTrigger(input.Trigger)
	if validationErr := validateCommandTrigger(trigger); validationErr != nil {
		return nil, validationErr
	}
	if action == CommandActionAlert && strings.TrimSpace(input.SplashTemplate) == "" {
		return nil, errors.New("splash template is required")
	}
	if input.CooldownSeconds < 0 {
		return nil, errors.New("cooldown must be non-negative")
	}
	if action == CommandActionAlert {
		if validationErr := validateCatalogSound(input.Sound); validationErr != nil {
			return nil, validationErr
		}
	} else {
		input.SplashTemplate = ""
		input.Sound = ""
		input.DurationMs = defaultCatalogDurationMs
		input.ImageAsset = ""
		input.SoundFile = ""
		input.SoundVolume = DefaultCatalogSoundVolume
		input.Layout = DefaultCatalogLayout
		input.ImageFit = DefaultCatalogImageFit
		input.ImageSizePct = DefaultCatalogImageSizePct
	}
	if action == CommandActionAlert {
		if fields := validateCommandMediaFields(
			input.ImageAsset, input.SoundFile, input.SoundVolume, input.ImageSizePct, input.Layout, input.ImageFit,
		); len(fields) > 0 {
			return nil, catalogMediaValidationError(fields)
		}
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

	_, err = s.db.Exec(`
		INSERT INTO commands (
			id, action, trigger, enabled, cooldown_seconds, splash_template, sound, duration_ms,
			image_asset, sound_file, sound_volume, layout, image_fit, image_size_pct
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id,
		action,
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
	Action          string
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

	action, err := normalizeCommandAction(input.Action)
	if err != nil {
		return nil, err
	}
	trigger := normalizeCommandTrigger(input.Trigger)
	if validationErr := validateCommandTrigger(trigger); validationErr != nil {
		return nil, validationErr
	}
	if action == CommandActionAlert && strings.TrimSpace(input.SplashTemplate) == "" {
		return nil, errors.New("splash template is required")
	}
	if input.CooldownSeconds < 0 {
		return nil, errors.New("cooldown must be non-negative")
	}
	if action == CommandActionAlert {
		if validationErr := validateCatalogSound(input.Sound); validationErr != nil {
			return nil, validationErr
		}
		if fields := validateCommandMediaFields(
			input.ImageAsset, input.SoundFile, input.SoundVolume, input.ImageSizePct, input.Layout, input.ImageFit,
		); len(fields) > 0 {
			return nil, catalogMediaValidationError(fields)
		}
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

	existing, err := s.getCommandLocked(input.ID)
	if err != nil {
		return nil, err
	}
	if action == CommandActionShowLeaderboard {
		input.SplashTemplate = existing.SplashTemplate
		input.Sound = existing.Sound
		input.DurationMs = existing.DurationMs
		input.ImageAsset = existing.ImageAsset
		input.SoundFile = existing.SoundFile
		input.SoundVolume = existing.SoundVolume
		input.Layout = existing.Layout
		input.ImageFit = existing.ImageFit
		input.ImageSizePct = existing.ImageSizePct
		durationMs = existing.DurationMs
		imageAsset = existing.ImageAsset
		soundFile = existing.SoundFile
		soundVolume = existing.SoundVolume
		layout = existing.Layout
		imageFit = existing.ImageFit
		imageSizePct = existing.ImageSizePct
	}

	result, err := s.db.Exec(`
		UPDATE commands
		SET action = ?, trigger = ?, enabled = ?, cooldown_seconds = ?, splash_template = ?, sound = ?, duration_ms = ?,
		    image_asset = ?, sound_file = ?, sound_volume = ?, layout = ?, image_fit = ?, image_size_pct = ?
		WHERE id = ?`,
		action,
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
		SELECT id, action, trigger, enabled, cooldown_seconds, splash_template, sound, duration_ms, image_asset, sound_file, sound_volume, layout, image_fit, image_size_pct
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
