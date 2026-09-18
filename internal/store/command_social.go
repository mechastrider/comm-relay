package store

import (
	"database/sql"
	"strings"

	"github.com/muonsoft/errors"
)

const (
	minCommandBuffPoints = 1
	maxCommandBuffPoints = 1000
)

type commandCatalogValidationErr struct {
	fields map[string]string
}

func (e commandCatalogValidationErr) Error() string {
	return "command catalog validation failed"
}

func commandCatalogValidationError(fields map[string]string) error {
	return commandCatalogValidationErr{fields: fields}
}

// CommandCatalogFields extracts field errors from command catalog validation failures.
func CommandCatalogFields(err error) map[string]string {
	if target, ok := errors.As[commandCatalogValidationErr](err); ok {
		return target.fields
	}
	return nil
}

func readStoredCommandAction(action string) string {
	action = strings.TrimSpace(strings.ToLower(action))
	if action == "" {
		return CommandActionAlert
	}
	return action
}

func normalizeCommandActionForSave(action string) (string, error) {
	action = readStoredCommandAction(action)
	switch action {
	case CommandActionAlert, CommandActionShowLeaderboard, CommandActionLike, CommandActionBuff:
		return action, nil
	default:
		return "", ErrInvalidCommandAction
	}
}

func validateProgressionQuota(quota int) error {
	if quota < 0 || quota > 100 {
		return ErrProgressionValidation
	}
	return nil
}

func (s *Store) validateCommandSocialFieldsLocked(action string, points *int, awardID string) error {
	fields := map[string]string{}
	awardID = strings.TrimSpace(awardID)

	switch action {
	case CommandActionLike:
		if awardID == "" {
			fields["award_id"] = "award is required for like commands"
		} else if err := s.ensureAwardExistsLocked(awardID); err != nil {
			if errors.Is(err, ErrAwardNotFound) {
				fields["award_id"] = "unknown award"
			} else {
				return err
			}
		}
	case CommandActionBuff:
		if points == nil || *points < minCommandBuffPoints || *points > maxCommandBuffPoints {
			fields["points"] = "points must be between 1 and 1000 for buff commands"
		}
	case CommandActionAlert, CommandActionShowLeaderboard:
		// Social fields cleared on save.
	default:
		return nil
	}

	if len(fields) > 0 {
		return commandCatalogValidationError(fields)
	}
	return nil
}

func (s *Store) ensureAwardExistsLocked(awardID string) error {
	var id string
	err := s.db.QueryRow(`SELECT id FROM award_types WHERE id = ?`, awardID).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrAwardNotFound
	}
	if err != nil {
		return errors.Errorf("lookup award %q: %w", awardID, err)
	}
	return nil
}

func commandPointsForInsert(action string, points *int) any {
	if action != CommandActionBuff || points == nil {
		return nil
	}
	return *points
}

func commandAwardIDForInsert(action, awardID string) any {
	if action != CommandActionLike {
		return nil
	}
	awardID = strings.TrimSpace(awardID)
	if awardID == "" {
		return nil
	}
	return awardID
}

func scanCommandPoints(raw sql.NullInt64) *int {
	if !raw.Valid {
		return nil
	}
	value := int(raw.Int64)
	return &value
}
