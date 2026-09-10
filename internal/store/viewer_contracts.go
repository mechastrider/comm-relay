package store

import (
	"database/sql"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/muonsoft/errors"
)

const (
	maxViewerContractTitleCodePoints     = 80
	maxViewerContractObjectiveCodePoints = 280
)

// OpenViewerContractInput describes a new operator-authored contract.
type OpenViewerContractInput struct {
	Title     string
	Objective string
	RewardID  string
	Now       time.Time
}

// AwardViewerContractInput describes an atomic contract settlement.
type AwardViewerContractInput struct {
	ID                   string
	ViewerID             string
	DayResetHour         int
	CustomAvatarsEnabled bool
	Now                  time.Time
}

// AwardViewerContractResult contains the durable contract result and the
// viewer presentation needed for post-commit award publication.
type AwardViewerContractResult struct {
	Contract             ViewerContract
	ViewerID             string
	ViewerDisplayName    string
	ViewerAvatarURL      string
	MeaningfulRankChange bool
}

// OpenViewerContract creates the only active contract and snapshots its reward.
func (s *Store) OpenViewerContract(input OpenViewerContractInput) (*ViewerContract, error) {
	title, objective, rewardID, err := normalizeViewerContractInput(input)
	if err != nil {
		return nil, err
	}

	now := input.Now
	if now.IsZero() {
		now = time.Now()
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	tx, err := s.db.Begin()
	if err != nil {
		return nil, errors.Errorf("begin viewer contract open: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	award, err := getAward(tx, rewardID)
	if err != nil {
		return nil, err
	}

	contract := ViewerContract{
		ID:                   uuid.NewString(),
		Status:               ViewerContractActive,
		Title:                title,
		Objective:            objective,
		RewardID:             award.ID,
		RewardName:           award.Name,
		RewardPoints:         award.Points,
		RewardSplashTemplate: award.SplashTemplate,
		RewardSound:          award.Sound,
		RewardDurationMs:     award.DurationMs,
		RewardImageAsset:     award.ImageAsset,
		RewardSoundFile:      award.SoundFile,
		RewardSoundVolume:    award.SoundVolume,
		RewardLayout:         award.Layout,
		RewardImageFit:       award.ImageFit,
		RewardImageSizePct:   award.ImageSizePct,
		AnnouncedAt:          now.UTC(),
	}
	_, err = tx.Exec(`
		INSERT INTO viewer_contracts (
			id, status, active_slot, title, objective,
			reward_id, reward_name, reward_points, reward_splash_template, reward_sound, reward_duration_ms,
			reward_image_asset, reward_sound_file, reward_sound_volume, reward_layout, reward_image_fit,
			reward_image_size_pct, winner_viewer_id, announced_at, settled_at
		) VALUES (?, 'active', 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL)`,
		contract.ID,
		contract.Title,
		contract.Objective,
		contract.RewardID,
		contract.RewardName,
		contract.RewardPoints,
		contract.RewardSplashTemplate,
		contract.RewardSound,
		contract.RewardDurationMs,
		nullString(contract.RewardImageAsset),
		nullString(contract.RewardSoundFile),
		contract.RewardSoundVolume,
		contract.RewardLayout,
		contract.RewardImageFit,
		contract.RewardImageSizePct,
		formatTime(contract.AnnouncedAt),
	)
	if err != nil {
		if isViewerContractActiveConstraint(err) {
			return nil, ErrViewerContractConflict
		}
		return nil, errors.Errorf("insert viewer contract: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return nil, errors.Errorf("commit viewer contract open: %w", err)
	}

	return &contract, nil
}

// CurrentViewerContract loads the current active contract.
func (s *Store) CurrentViewerContract() (*ViewerContract, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	contract, err := getActiveViewerContract(s.db)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrViewerContractNotFound
	}
	if err != nil {
		return nil, errors.Errorf("get current viewer contract: %w", err)
	}
	return contract, nil
}

// ActiveViewerContract reloads and validates an id as the current active contract.
// It intentionally returns a conflict for a missing or terminal id so lifecycle
// actions cannot reveal terminal-contract state through their public API.
func (s *Store) ActiveViewerContract(id string) (*ViewerContract, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, ErrViewerContractConflict
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	contract, err := getActiveViewerContractByID(s.db, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrViewerContractConflict
	}
	if err != nil {
		return nil, errors.Errorf("get active viewer contract: %w", err)
	}
	return contract, nil
}

// AwardViewerContract awards the active contract to a visible canonical viewer
// and records its normal award event in one transaction.
func (s *Store) AwardViewerContract(input AwardViewerContractInput) (*AwardViewerContractResult, error) {
	contractID := strings.TrimSpace(input.ID)
	viewerID := strings.TrimSpace(input.ViewerID)
	if contractID == "" || viewerID == "" {
		return nil, ErrInvalidViewerContract
	}
	now := input.Now
	if now.IsZero() {
		now = time.Now()
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.ensureOpenSessionLocked(now); err != nil {
		return nil, errors.Errorf("ensure open session for viewer contract award: %w", err)
	}
	sessionID, err := s.openSessionLocked()
	if err != nil {
		return nil, errors.Errorf("lookup open session for viewer contract award: %w", err)
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, errors.Errorf("begin viewer contract award: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	contract, err := getActiveViewerContractByID(tx, contractID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrViewerContractConflict
	}
	if err != nil {
		return nil, errors.Errorf("load active viewer contract for award: %w", err)
	}
	if visibleErr := loadVisibleViewer(tx, viewerID); visibleErr != nil {
		return nil, visibleErr
	}

	dayKey := DayKey(now, input.DayResetHour)
	beforeRanks, err := captureTopThree(tx, sessionID, dayKey)
	if err != nil {
		return nil, err
	}
	if _, xpErr := tx.Exec(`UPDATE viewers SET xp = xp + ? WHERE id = ?`, contract.RewardPoints, viewerID); xpErr != nil {
		return nil, errors.Errorf("increment viewer xp for contract award: %w", xpErr)
	}
	if periodErr := s.addPeriodXPLocked(tx, viewerID, sessionID, dayKey, contract.RewardPoints); periodErr != nil {
		return nil, periodErr
	}

	viewerDisplayName, viewerAvatarURL, err := contractAwardViewerPresentation(tx, viewerID, input.CustomAvatarsEnabled)
	if err != nil {
		return nil, err
	}
	afterRanks, err := captureTopThree(tx, sessionID, dayKey)
	if err != nil {
		return nil, err
	}
	if eventErr := s.appendInteractionEventLocked(tx, AppendInteractionEventInput{
		Kind:       InteractionEventAward,
		ContractID: contract.ID,
		ViewerID:   viewerID,
		AwardID:    contract.RewardID,
		AwardName:  contract.RewardName,
		Points:     contract.RewardPoints,
		Now:        now,
	}); eventErr != nil {
		return nil, errors.Errorf("append viewer contract award event: %w", eventErr)
	}
	result, err := tx.Exec(`
		UPDATE viewer_contracts
		SET status = 'awarded', active_slot = NULL, winner_viewer_id = ?, settled_at = ?
		WHERE id = ? AND status = 'active' AND active_slot = 1`,
		viewerID, formatTime(now), contract.ID)
	if err != nil {
		return nil, errors.Errorf("settle viewer contract award: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return nil, errors.Errorf("count viewer contract award transition: %w", err)
	}
	if rows == 0 {
		return nil, ErrViewerContractConflict
	}
	if err := tx.Commit(); err != nil {
		return nil, errors.Errorf("commit viewer contract award: %w", err)
	}

	contract.Status = ViewerContractAwarded
	contract.WinnerViewerID = viewerID
	contract.SettledAt = now.UTC()
	return &AwardViewerContractResult{
		Contract:             *contract,
		ViewerID:             viewerID,
		ViewerDisplayName:    viewerDisplayName,
		ViewerAvatarURL:      viewerAvatarURL,
		MeaningfulRankChange: topThreeChanged(beforeRanks, afterRanks),
	}, nil
}

// CloseViewerContract closes the active contract without granting a reward.
func (s *Store) CloseViewerContract(id string, now time.Time) (*ViewerContract, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, ErrViewerContractConflict
	}
	if now.IsZero() {
		now = time.Now()
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	tx, err := s.db.Begin()
	if err != nil {
		return nil, errors.Errorf("begin viewer contract close: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	contract, err := getActiveViewerContractByID(tx, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrViewerContractConflict
	}
	if err != nil {
		return nil, errors.Errorf("load active viewer contract for close: %w", err)
	}
	result, err := tx.Exec(`
		UPDATE viewer_contracts
		SET status = 'closed', active_slot = NULL, settled_at = ?
		WHERE id = ? AND status = 'active' AND active_slot = 1`,
		formatTime(now), id)
	if err != nil {
		return nil, errors.Errorf("close viewer contract: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return nil, errors.Errorf("count viewer contract close transition: %w", err)
	}
	if rows == 0 {
		return nil, ErrViewerContractConflict
	}
	if err := tx.Commit(); err != nil {
		return nil, errors.Errorf("commit viewer contract close: %w", err)
	}

	contract.Status = ViewerContractClosed
	contract.SettledAt = now.UTC()
	return contract, nil
}

func normalizeViewerContractInput(input OpenViewerContractInput) (string, string, string, error) {
	title := strings.TrimSpace(input.Title)
	objective := strings.TrimSpace(input.Objective)
	rewardID := strings.TrimSpace(input.RewardID)
	if title == "" || len([]rune(title)) > maxViewerContractTitleCodePoints ||
		objective == "" || len([]rune(objective)) > maxViewerContractObjectiveCodePoints || rewardID == "" {
		return "", "", "", ErrInvalidViewerContract
	}

	return title, objective, rewardID, nil
}

func getAward(q interface {
	QueryRow(query string, args ...any) *sql.Row
}, id string) (*AwardType, error) {
	award, err := scanAward(q.QueryRow(`
		SELECT id, name, points, splash_template, sound, duration_ms, image_asset, sound_file, sound_volume, layout, image_fit, image_size_pct
		FROM award_types WHERE id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrAwardNotFound
	}
	if err != nil {
		return nil, errors.Errorf("get award %q: %w", id, err)
	}
	return &award, nil
}

func getActiveViewerContract(q interface {
	QueryRow(query string, args ...any) *sql.Row
}) (*ViewerContract, error) {
	return scanViewerContract(q.QueryRow(viewerContractSelectSQL + ` WHERE status = 'active' AND active_slot = 1`))
}

func getActiveViewerContractByID(q interface {
	QueryRow(query string, args ...any) *sql.Row
}, id string) (*ViewerContract, error) {
	return scanViewerContract(q.QueryRow(viewerContractSelectSQL+` WHERE id = ? AND status = 'active' AND active_slot = 1`, id))
}

const viewerContractSelectSQL = `
	SELECT id, status, title, objective,
	       reward_id, reward_name, reward_points, reward_splash_template, reward_sound, reward_duration_ms,
	       reward_image_asset, reward_sound_file, reward_sound_volume, reward_layout, reward_image_fit,
	       reward_image_size_pct, winner_viewer_id, announced_at, settled_at
	FROM viewer_contracts`

func scanViewerContract(scanner interface{ Scan(dest ...any) error }) (*ViewerContract, error) {
	var contract ViewerContract
	var imageAsset, soundFile, winnerID sql.NullString
	var announcedAt string
	var settledAt sql.NullString
	if err := scanner.Scan(
		&contract.ID,
		&contract.Status,
		&contract.Title,
		&contract.Objective,
		&contract.RewardID,
		&contract.RewardName,
		&contract.RewardPoints,
		&contract.RewardSplashTemplate,
		&contract.RewardSound,
		&contract.RewardDurationMs,
		&imageAsset,
		&soundFile,
		&contract.RewardSoundVolume,
		&contract.RewardLayout,
		&contract.RewardImageFit,
		&contract.RewardImageSizePct,
		&winnerID,
		&announcedAt,
		&settledAt,
	); err != nil {
		return nil, err
	}
	if imageAsset.Valid {
		contract.RewardImageAsset = imageAsset.String
	}
	if soundFile.Valid {
		contract.RewardSoundFile = soundFile.String
	}
	if winnerID.Valid {
		contract.WinnerViewerID = winnerID.String
	}
	var err error
	contract.AnnouncedAt, err = parseTime(announcedAt)
	if err != nil {
		return nil, err
	}
	if settledAt.Valid {
		contract.SettledAt, err = parseTime(settledAt.String)
		if err != nil {
			return nil, err
		}
	}
	return &contract, nil
}

func isViewerContractActiveConstraint(err error) bool {
	return strings.Contains(strings.ToLower(err.Error()), "viewer_contracts.active_slot") ||
		strings.Contains(strings.ToLower(err.Error()), "unique constraint failed")
}

func contractAwardViewerPresentation(tx *sql.Tx, viewerID string, customAvatarsEnabled bool) (string, string, error) {
	var displayName, customAvatar, portrait string
	err := tx.QueryRow(`
		SELECT `+effectiveDisplayNameSQL+`, TRIM(v.custom_avatar), COALESCE(`+CanonicalViewerPortraitSQL+`, '')
		FROM viewers v WHERE v.id = ?`, viewerID).Scan(&displayName, &customAvatar, &portrait)
	if err != nil {
		return "", "", errors.Errorf("load contract award viewer presentation: %w", err)
	}
	return displayName, ResolvePortraitURL(PortraitFields{
		CustomAvatar: customAvatar,
		RemoteURL:    portrait,
	}, customAvatarsEnabled), nil
}
