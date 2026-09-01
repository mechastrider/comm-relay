package config

import (
	"strings"

	"github.com/muonsoft/errors"
)

// ErrBlankPresetID is returned when activation is requested without a preset id.
var ErrBlankPresetID = errors.New("preset id is required")

// ErrUnknownPresetID is returned when activation names a preset that does not exist.
var ErrUnknownPresetID = errors.New("unknown preset id")

// ActivatePreset validates presetID and atomically updates overlay.active_preset_id.
func (s *Store) ActivatePreset(presetID string) error {
	id := strings.TrimSpace(presetID)
	if id == "" {
		return ErrBlankPresetID
	}

	return s.Mutate(func(current *Config) error {
		if _, ok := current.Overlay.PresetByID(id); !ok {
			return ErrUnknownPresetID
		}
		current.Overlay.ActivePresetID = id
		current.Overlay.syncLegacyFieldsFromActive()
		return nil
	})
}
