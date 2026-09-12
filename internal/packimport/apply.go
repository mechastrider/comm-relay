package packimport

import (
	"fmt"
	"os"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/overlayassets"
	"github.com/mechastrider/comm-relay/internal/store"
)

// ActionKind describes one planned import operation.
type ActionKind string

const (
	// ActionCreate inserts a command that is absent from the current catalog.
	ActionCreate ActionKind = "create"
	// ActionUpdate changes an existing command to match the pack.
	ActionUpdate ActionKind = "update"
	// ActionSkip leaves an existing command unchanged.
	ActionSkip ActionKind = "skip"
)

// PlannedAction is one command upsert decision.
type PlannedAction struct {
	Kind    ActionKind
	Trigger string
	Detail  string
	Command ResolvedCommand
}

// ApplyOptions controls pack import behavior.
type ApplyOptions struct {
	DryRun        bool
	DurationsOnly bool
}

// PlanApply compares pack commands with the current store catalog.
func PlanApply(pack *Pack, existing []store.Command, opts ApplyOptions) []PlannedAction {
	byTrigger := make(map[string]store.Command, len(existing))
	for _, cmd := range existing {
		byTrigger[cmd.Trigger] = cmd
	}

	planned := make([]PlannedAction, 0, len(pack.Commands))
	for _, cmd := range pack.ResolvedCommands() {
		current, ok := byTrigger[cmd.Trigger]
		if !ok {
			if opts.DurationsOnly {
				planned = append(planned, PlannedAction{
					Kind:    ActionSkip,
					Trigger: cmd.Trigger,
					Detail:  "not found",
					Command: cmd,
				})
				continue
			}
			planned = append(planned, PlannedAction{
				Kind:    ActionCreate,
				Trigger: cmd.Trigger,
				Detail:  "new command",
				Command: cmd,
			})
			continue
		}

		if opts.DurationsOnly {
			if current.DurationMs == normalizeDurationMs(cmd.DurationMs) {
				planned = append(planned, PlannedAction{
					Kind:    ActionSkip,
					Trigger: cmd.Trigger,
					Detail:  "duration unchanged",
					Command: cmd,
				})
				continue
			}
			planned = append(planned, PlannedAction{
				Kind:    ActionUpdate,
				Trigger: cmd.Trigger,
				Detail:  fmt.Sprintf("duration %d -> %d ms", current.DurationMs, normalizeDurationMs(cmd.DurationMs)),
				Command: cmd,
			})
			continue
		}

		if commandMatchesPack(current, cmd) {
			planned = append(planned, PlannedAction{
				Kind:    ActionSkip,
				Trigger: cmd.Trigger,
				Detail:  "unchanged",
				Command: cmd,
			})
			continue
		}

		planned = append(planned, PlannedAction{
			Kind:    ActionUpdate,
			Trigger: cmd.Trigger,
			Detail:  "fields differ",
			Command: cmd,
		})
	}

	return planned
}

// ApplyResult summarizes one import run.
type ApplyResult struct {
	Planned          []PlannedAction
	PlannedGreetings []PlannedGreetingAction
	Applied          int
	AppliedGreetings int
}

// Apply imports a validated pack into the store and overlay assets directory.
func Apply(pack *Pack, s *store.Store, assetsDir string, opts ApplyOptions) (*ApplyResult, error) {
	if err := ValidatePack(pack); err != nil {
		return nil, err
	}

	existing, err := s.ListCommands()
	if err != nil {
		return nil, errors.Errorf("list commands: %w", err)
	}

	planned := PlanApply(pack, existing, opts)
	result := &ApplyResult{Planned: planned}

	if opts.DryRun {
		return result, nil
	}

	byTrigger := make(map[string]store.Command, len(existing))
	for _, cmd := range existing {
		byTrigger[cmd.Trigger] = cmd
	}

	for _, action := range planned {
		switch action.Kind {
		case ActionSkip:
			continue
		case ActionCreate, ActionUpdate:
			if applyErr := applyOne(s, assetsDir, byTrigger, action, opts.DurationsOnly); applyErr != nil {
				return result, applyErr
			}
			result.Applied++
		default:
			return result, fmt.Errorf("unknown action kind %q", action.Kind)
		}
	}

	plannedGreetings, appliedGreetings, err := applyGreetings(pack, s, assetsDir, opts)
	if err != nil {
		return result, err
	}
	result.PlannedGreetings = plannedGreetings
	result.AppliedGreetings = appliedGreetings

	return result, nil
}

func applyOne(s *store.Store, assetsDir string, byTrigger map[string]store.Command, action PlannedAction, durationsOnly bool) error {
	cmd := action.Command
	current, exists := byTrigger[cmd.Trigger]

	if durationsOnly {
		if !exists {
			return fmt.Errorf("command !%s not found", cmd.Trigger)
		}
		_, err := s.UpdateCommand(store.UpdateCommandInput{
			ID:              current.ID,
			Action:          current.Action,
			Trigger:         current.Trigger,
			Enabled:         current.Enabled,
			CooldownSeconds: current.CooldownSeconds,
			SplashTemplate:  current.SplashTemplate,
			Sound:           current.Sound,
			DurationMs:      normalizeDurationMs(cmd.DurationMs),
			ImageAsset:      current.ImageAsset,
			SoundFile:       current.SoundFile,
			SoundVolume:     current.SoundVolume,
			Layout:          current.Layout,
			ImageFit:        current.ImageFit,
			ImageSizePct:    current.ImageSizePct,
		})
		return err
	}

	actionName, err := normalizeAction(cmd.Action)
	if err != nil {
		return err
	}

	input, err := buildCommandInput(assetsDir, cmd, actionName)
	if err != nil {
		return err
	}

	if exists {
		input.ID = current.ID
		updated, updateErr := s.UpdateCommand(input.toUpdate())
		if updateErr != nil {
			return updateErr
		}
		byTrigger[cmd.Trigger] = *updated
		return nil
	}

	created, err := s.CreateCommand(input.toCreate())
	if err != nil {
		return err
	}
	byTrigger[cmd.Trigger] = *created
	return nil
}

type commandInput struct {
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

func (c commandInput) toCreate() store.CreateCommandInput {
	return store.CreateCommandInput{
		ID:              c.ID,
		Action:          c.Action,
		Trigger:         c.Trigger,
		Enabled:         c.Enabled,
		CooldownSeconds: c.CooldownSeconds,
		SplashTemplate:  c.SplashTemplate,
		Sound:           c.Sound,
		DurationMs:      c.DurationMs,
		ImageAsset:      c.ImageAsset,
		SoundFile:       c.SoundFile,
		SoundVolume:     c.SoundVolume,
		Layout:          c.Layout,
		ImageFit:        c.ImageFit,
		ImageSizePct:    c.ImageSizePct,
	}
}

func (c commandInput) toUpdate() store.UpdateCommandInput {
	return store.UpdateCommandInput{
		ID:              c.ID,
		Action:          c.Action,
		Trigger:         c.Trigger,
		Enabled:         c.Enabled,
		CooldownSeconds: c.CooldownSeconds,
		SplashTemplate:  c.SplashTemplate,
		Sound:           c.Sound,
		DurationMs:      c.DurationMs,
		ImageAsset:      c.ImageAsset,
		SoundFile:       c.SoundFile,
		SoundVolume:     c.SoundVolume,
		Layout:          c.Layout,
		ImageFit:        c.ImageFit,
		ImageSizePct:    c.ImageSizePct,
	}
}

func buildCommandInput(assetsDir string, cmd ResolvedCommand, action string) (commandInput, error) {
	input := commandInput{
		ID:              cmd.ID,
		Action:          action,
		Trigger:         cmd.Trigger,
		Enabled:         cmd.Enabled,
		CooldownSeconds: cmd.CooldownSeconds,
		SplashTemplate:  cmd.SplashTemplate,
		Sound:           cmd.Sound,
		DurationMs:      normalizeDurationMs(cmd.DurationMs),
		SoundFile:       cmd.SoundFile,
		SoundVolume:     store.NormalizeCatalogSoundVolume(cmd.SoundVolume),
		Layout:          store.NormalizeCatalogLayout(cmd.Layout),
		ImageFit:        store.NormalizeCatalogImageFit(cmd.ImageFit),
		ImageSizePct:    store.NormalizeCatalogImageSizePct(cmd.ImageSizePct),
	}

	if action == store.CommandActionAlert && cmd.ImagePath != "" {
		data, err := os.ReadFile(cmd.ImagePath)
		if err != nil {
			return commandInput{}, errors.Errorf("read image %s: %w", cmd.ImagePath, err)
		}
		assetName, err := overlayassets.Save(assetsDir, overlayassets.KindAlertImage, data)
		if err != nil {
			return commandInput{}, errors.Errorf("save image for !%s: %w", cmd.Trigger, err)
		}
		input.ImageAsset = assetName
	}

	if action == store.CommandActionAlert && cmd.AudioPath != "" {
		data, err := os.ReadFile(cmd.AudioPath)
		if err != nil {
			return commandInput{}, errors.Errorf("read audio %s: %w", cmd.AudioPath, err)
		}
		assetName, err := overlayassets.Save(assetsDir, overlayassets.KindAlertSound, data)
		if err != nil {
			return commandInput{}, errors.Errorf("save audio for !%s: %w", cmd.Trigger, err)
		}
		input.SoundFile = assetName
	}

	return input, nil
}

func commandMatchesPack(current store.Command, cmd ResolvedCommand) bool {
	action, err := normalizeAction(cmd.Action)
	if err != nil {
		return false
	}

	return current.Trigger == cmd.Trigger &&
		current.Enabled == cmd.Enabled &&
		current.Action == action &&
		current.CooldownSeconds == cmd.CooldownSeconds &&
		current.SplashTemplate == cmd.SplashTemplate &&
		current.Sound == cmd.Sound &&
		current.DurationMs == normalizeDurationMs(cmd.DurationMs) &&
		soundMatchesPack(current.SoundFile, cmd) &&
		current.SoundVolume == store.NormalizeCatalogSoundVolume(cmd.SoundVolume) &&
		current.Layout == store.NormalizeCatalogLayout(cmd.Layout) &&
		current.ImageFit == store.NormalizeCatalogImageFit(cmd.ImageFit) &&
		current.ImageSizePct == store.NormalizeCatalogImageSizePct(cmd.ImageSizePct) &&
		current.ImageAsset != ""
}

func soundMatchesPack(currentSoundFile string, cmd ResolvedCommand) bool {
	if cmd.AudioPath != "" {
		return currentSoundFile != ""
	}
	return currentSoundFile == cmd.SoundFile
}

func normalizeDurationMs(durationMs int) int {
	if durationMs < 1 {
		return 5000
	}
	return durationMs
}
