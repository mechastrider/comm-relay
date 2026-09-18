package store

import (
	"database/sql"
	"regexp"
	"sort"
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

const maxCommandAliases = 16

// Supported command actions.
const (
	CommandActionAlert           = "alert"
	CommandActionShowLeaderboard = "show_leaderboard"
	CommandActionLike            = "like"
	CommandActionBuff            = "buff"
)

func normalizeCommandAction(action string) (string, error) {
	return normalizeCommandActionForSave(action)
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

func validateCommandAlias(alias string) error {
	if alias == "" {
		return ErrInvalidAlias
	}
	if strings.Contains(alias, "!") {
		return ErrInvalidAlias
	}
	if strings.ContainsAny(alias, " \t") {
		return ErrInvalidAlias
	}
	if !commandTriggerPattern.MatchString(alias) {
		return ErrInvalidAlias
	}

	return nil
}

func normalizeCommandAliases(raw []string) ([]string, error) {
	if len(raw) == 0 {
		return []string{}, nil
	}

	seen := make(map[string]struct{}, len(raw))
	out := make([]string, 0, len(raw))
	for _, rawAlias := range raw {
		alias := normalizeCommandTrigger(rawAlias)
		if err := validateCommandAlias(alias); err != nil {
			return nil, err
		}
		if _, ok := seen[alias]; ok {
			return nil, ErrInvalidAlias
		}
		seen[alias] = struct{}{}
		out = append(out, alias)
	}
	if len(out) > maxCommandAliases {
		return nil, ErrTooManyAliases
	}
	sort.Strings(out)

	return out, nil
}

func (s *Store) loadAllCommandAliasesLocked() (map[string][]string, error) {
	rows, err := s.db.Query(`SELECT command_id, alias FROM command_aliases ORDER BY command_id, alias`)
	if err != nil {
		return nil, errors.Errorf("list command aliases: %w", err)
	}
	defer func() { _ = rows.Close() }()

	byCommand := make(map[string][]string)
	for rows.Next() {
		var commandID, alias string
		if err := rows.Scan(&commandID, &alias); err != nil {
			return nil, errors.Errorf("scan command alias: %w", err)
		}
		byCommand[commandID] = append(byCommand[commandID], alias)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.Errorf("iterate command aliases: %w", err)
	}

	return byCommand, nil
}

func (s *Store) loadCommandAliasesLocked(commandID string) ([]string, error) {
	rows, err := s.db.Query(`SELECT alias FROM command_aliases WHERE command_id = ? ORDER BY alias`, commandID)
	if err != nil {
		return nil, errors.Errorf("list aliases for command %q: %w", commandID, err)
	}
	defer func() { _ = rows.Close() }()

	var aliases []string
	for rows.Next() {
		var alias string
		if err := rows.Scan(&alias); err != nil {
			return nil, errors.Errorf("scan alias for command %q: %w", commandID, err)
		}
		aliases = append(aliases, alias)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.Errorf("iterate aliases for command %q: %w", commandID, err)
	}
	if aliases == nil {
		return []string{}, nil
	}

	return aliases, nil
}

func (s *Store) checkCommandNameCollisionsLocked(excludeID, trigger string, aliases []string) error {
	var otherAlias string
	err := s.db.QueryRow(
		`SELECT alias FROM command_aliases WHERE alias = ? AND command_id != ?`,
		trigger,
		excludeID,
	).Scan(&otherAlias)
	if err == nil {
		return ErrDuplicateTrigger
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return errors.Errorf("check trigger alias collision: %w", err)
	}

	for _, alias := range aliases {
		if alias == trigger {
			return ErrAliasMatchesTrigger
		}

		var otherID string
		triggerErr := s.db.QueryRow(`SELECT id FROM commands WHERE trigger = ? AND id != ?`, alias, excludeID).Scan(&otherID)
		if triggerErr == nil {
			return ErrDuplicateAlias
		}
		if !errors.Is(triggerErr, sql.ErrNoRows) {
			return errors.Errorf("check alias trigger collision: %w", triggerErr)
		}

		var otherCommandID string
		aliasErr := s.db.QueryRow(
			`SELECT command_id FROM command_aliases WHERE alias = ? AND command_id != ?`,
			alias,
			excludeID,
		).Scan(&otherCommandID)
		if aliasErr == nil {
			return ErrDuplicateAlias
		}
		if !errors.Is(aliasErr, sql.ErrNoRows) {
			return errors.Errorf("check alias collision: %w", aliasErr)
		}
	}

	return nil
}

func replaceCommandAliasesTx(tx *sql.Tx, commandID string, aliases []string) error {
	if _, err := tx.Exec(`DELETE FROM command_aliases WHERE command_id = ?`, commandID); err != nil {
		return errors.Errorf("delete command aliases: %w", err)
	}
	for _, alias := range aliases {
		if _, err := tx.Exec(`INSERT INTO command_aliases (command_id, alias) VALUES (?, ?)`, commandID, alias); err != nil {
			if isUniqueConstraint(err) {
				return ErrDuplicateAlias
			}
			return errors.Errorf("insert command alias: %w", err)
		}
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
	var pointsRaw sql.NullInt64
	var awardIDRaw sql.NullString

	err := scanner.Scan(
		&cmd.ID,
		&cmd.Action,
		&cmd.Trigger,
		&enabled,
		&cmd.CooldownSeconds,
		&pointsRaw,
		&awardIDRaw,
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
	cmd.Action = readStoredCommandAction(cmd.Action)
	cmd.Points = scanCommandPoints(pointsRaw)
	if awardIDRaw.Valid {
		cmd.AwardID = awardIDRaw.String
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
		SELECT id, action, trigger, enabled, cooldown_seconds, points, award_id, splash_template, sound, duration_ms, image_asset, sound_file, sound_volume, layout, image_fit, image_size_pct
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
	if rowsErr := rows.Err(); rowsErr != nil {
		return nil, errors.Errorf("iterate commands: %w", rowsErr)
	}

	aliasesByCommand, err := s.loadAllCommandAliasesLocked()
	if err != nil {
		return nil, err
	}
	for i := range commands {
		aliases := aliasesByCommand[commands[i].ID]
		if aliases == nil {
			aliases = []string{}
		}
		commands[i].Aliases = aliases
	}

	return commands, nil
}

// GetCommand returns one command by id.
func (s *Store) GetCommand(id string) (*Command, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	row := s.db.QueryRow(`
		SELECT id, action, trigger, enabled, cooldown_seconds, points, award_id, splash_template, sound, duration_ms, image_asset, sound_file, sound_volume, layout, image_fit, image_size_pct
		FROM commands
		WHERE id = ?`, id)

	cmd, err := scanCommand(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrCommandNotFound
	}
	if err != nil {
		return nil, errors.Errorf("get command %q: %w", id, err)
	}

	aliases, err := s.loadCommandAliasesLocked(id)
	if err != nil {
		return nil, err
	}
	cmd.Aliases = aliases

	return &cmd, nil
}

// CreateCommandInput is the payload for CreateCommand.
type CreateCommandInput struct {
	ID              string
	Action          string
	Trigger         string
	Aliases         []string
	Enabled         bool
	CooldownSeconds int
	Points          *int
	AwardID         string
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
	aliases, err := normalizeCommandAliases(input.Aliases)
	if err != nil {
		return nil, err
	}
	if action == CommandActionAlert && strings.TrimSpace(input.SplashTemplate) == "" {
		return nil, errors.New("splash template is required")
	}
	if input.CooldownSeconds < 0 {
		return nil, errors.New("cooldown must be non-negative")
	}
	switch action {
	case CommandActionAlert:
		if validationErr := validateCatalogSound(input.Sound); validationErr != nil {
			return nil, validationErr
		}
		if fields := validateCommandMediaFields(
			input.ImageAsset, input.SoundFile, input.SoundVolume, input.ImageSizePct, input.Layout, input.ImageFit,
		); len(fields) > 0 {
			return nil, catalogMediaValidationError(fields)
		}
	case CommandActionShowLeaderboard, CommandActionLike, CommandActionBuff:
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

	if collisionErr := s.checkCommandNameCollisionsLocked(id, trigger, aliases); collisionErr != nil {
		return nil, collisionErr
	}
	if socialErr := s.validateCommandSocialFieldsLocked(action, input.Points, input.AwardID); socialErr != nil {
		return nil, socialErr
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, errors.Errorf("begin create command tx: %w", err)
	}

	_, err = tx.Exec(`
		INSERT INTO commands (
			id, action, trigger, enabled, cooldown_seconds, points, award_id, splash_template, sound, duration_ms,
			image_asset, sound_file, sound_volume, layout, image_fit, image_size_pct
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id,
		action,
		trigger,
		enabled,
		input.CooldownSeconds,
		commandPointsForInsert(action, input.Points),
		commandAwardIDForInsert(action, input.AwardID),
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
		_ = tx.Rollback()
		if isUniqueConstraint(err) {
			return nil, ErrDuplicateTrigger
		}
		return nil, errors.Errorf("insert command: %w", err)
	}

	if err := replaceCommandAliasesTx(tx, id, aliases); err != nil {
		_ = tx.Rollback()
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, errors.Errorf("commit create command: %w", err)
	}

	return s.getCommandLocked(id)
}

// UpdateCommandInput is the payload for UpdateCommand.
type UpdateCommandInput struct {
	ID              string
	Action          string
	Trigger         string
	Aliases         []string
	Enabled         bool
	CooldownSeconds int
	Points          *int
	AwardID         string
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
	aliases, err := normalizeCommandAliases(input.Aliases)
	if err != nil {
		return nil, err
	}
	if action == CommandActionAlert && strings.TrimSpace(input.SplashTemplate) == "" {
		return nil, errors.New("splash template is required")
	}
	if input.CooldownSeconds < 0 {
		return nil, errors.New("cooldown must be non-negative")
	}
	switch action {
	case CommandActionAlert:
		if validationErr := validateCatalogSound(input.Sound); validationErr != nil {
			return nil, validationErr
		}
		if fields := validateCommandMediaFields(
			input.ImageAsset, input.SoundFile, input.SoundVolume, input.ImageSizePct, input.Layout, input.ImageFit,
		); len(fields) > 0 {
			return nil, catalogMediaValidationError(fields)
		}
	case CommandActionLike, CommandActionBuff:
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
	switch action {
	case CommandActionShowLeaderboard:
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
	case CommandActionLike, CommandActionBuff:
		durationMs = defaultCatalogDurationMs
	}

	if collisionErr := s.checkCommandNameCollisionsLocked(input.ID, trigger, aliases); collisionErr != nil {
		return nil, collisionErr
	}
	if socialErr := s.validateCommandSocialFieldsLocked(action, input.Points, input.AwardID); socialErr != nil {
		return nil, socialErr
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, errors.Errorf("begin update command tx: %w", err)
	}

	result, err := tx.Exec(`
		UPDATE commands
		SET action = ?, trigger = ?, enabled = ?, cooldown_seconds = ?, points = ?, award_id = ?,
		    splash_template = ?, sound = ?, duration_ms = ?,
		    image_asset = ?, sound_file = ?, sound_volume = ?, layout = ?, image_fit = ?, image_size_pct = ?
		WHERE id = ?`,
		action,
		trigger,
		enabled,
		input.CooldownSeconds,
		commandPointsForInsert(action, input.Points),
		commandAwardIDForInsert(action, input.AwardID),
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
		_ = tx.Rollback()
		if isUniqueConstraint(err) {
			return nil, ErrDuplicateTrigger
		}
		return nil, errors.Errorf("update command: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		_ = tx.Rollback()
		return nil, errors.Errorf("rows affected after update command: %w", err)
	}
	if rows == 0 {
		_ = tx.Rollback()
		return nil, ErrCommandNotFound
	}

	if err := replaceCommandAliasesTx(tx, input.ID, aliases); err != nil {
		_ = tx.Rollback()
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, errors.Errorf("commit update command: %w", err)
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
		SELECT id, action, trigger, enabled, cooldown_seconds, points, award_id, splash_template, sound, duration_ms, image_asset, sound_file, sound_volume, layout, image_fit, image_size_pct
		FROM commands
		WHERE id = ?`, id)

	cmd, err := scanCommand(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrCommandNotFound
	}
	if err != nil {
		return nil, errors.Errorf("get command %q: %w", id, err)
	}

	aliases, err := s.loadCommandAliasesLocked(id)
	if err != nil {
		return nil, err
	}
	cmd.Aliases = aliases

	return &cmd, nil
}
