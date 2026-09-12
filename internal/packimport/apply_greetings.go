package packimport

import (
	"fmt"
	"os"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/overlayassets"
	"github.com/mechastrider/comm-relay/internal/store"
)

// PlannedGreetingAction is one greeting update decision.
type PlannedGreetingAction struct {
	Kind     ActionKind
	ID       string
	Detail   string
	Greeting ResolvedGreeting
}

// PlanGreetingApply compares pack greetings with the current store catalog.
func PlanGreetingApply(pack *Pack, existing []store.Greeting, opts ApplyOptions) []PlannedGreetingAction {
	byID := make(map[store.GreetingKind]store.Greeting, len(existing))
	for _, greeting := range existing {
		byID[greeting.ID] = greeting
	}

	planned := make([]PlannedGreetingAction, 0, len(pack.Greetings))
	for _, greeting := range pack.ResolvedGreetings() {
		kind := store.GreetingKind(greeting.ID)
		current, ok := byID[kind]
		if !ok {
			planned = append(planned, PlannedGreetingAction{
				Kind:     ActionSkip,
				ID:       greeting.ID,
				Detail:   "definition missing",
				Greeting: greeting,
			})
			continue
		}

		if opts.DurationsOnly {
			if current.DurationMs == normalizeDurationMs(greeting.DurationMs) {
				planned = append(planned, PlannedGreetingAction{
					Kind:     ActionSkip,
					ID:       greeting.ID,
					Detail:   "duration unchanged",
					Greeting: greeting,
				})
				continue
			}
			planned = append(planned, PlannedGreetingAction{
				Kind:     ActionUpdate,
				ID:       greeting.ID,
				Detail:   fmt.Sprintf("duration %d -> %d ms", current.DurationMs, normalizeDurationMs(greeting.DurationMs)),
				Greeting: greeting,
			})
			continue
		}

		if greetingMatchesPack(current, greeting) {
			planned = append(planned, PlannedGreetingAction{
				Kind:     ActionSkip,
				ID:       greeting.ID,
				Detail:   "unchanged",
				Greeting: greeting,
			})
			continue
		}

		planned = append(planned, PlannedGreetingAction{
			Kind:     ActionUpdate,
			ID:       greeting.ID,
			Detail:   "fields differ",
			Greeting: greeting,
		})
	}

	return planned
}

func applyGreetings(pack *Pack, s *store.Store, assetsDir string, opts ApplyOptions) ([]PlannedGreetingAction, int, error) {
	if len(pack.Greetings) == 0 {
		return nil, 0, nil
	}

	existing, err := s.ListGreetings()
	if err != nil {
		return nil, 0, errors.Errorf("list greetings: %w", err)
	}

	planned := PlanGreetingApply(pack, existing, opts)
	applied := 0

	for _, action := range planned {
		switch action.Kind {
		case ActionSkip:
			continue
		case ActionUpdate:
			if err := applyOneGreeting(s, assetsDir, action, opts.DurationsOnly); err != nil {
				return planned, applied, err
			}
			applied++
		default:
			return planned, applied, fmt.Errorf("unknown greeting action kind %q", action.Kind)
		}
	}

	return planned, applied, nil
}

func applyOneGreeting(s *store.Store, assetsDir string, action PlannedGreetingAction, durationsOnly bool) error {
	spec := action.Greeting
	current, err := s.GetGreeting(store.GreetingKind(spec.ID))
	if err != nil {
		return err
	}

	if durationsOnly {
		current.DurationMs = normalizeDurationMs(spec.DurationMs)
		_, err = s.UpdateGreeting(*current)
		return err
	}

	input, err := buildGreetingInput(assetsDir, spec, *current)
	if err != nil {
		return err
	}

	_, err = s.UpdateGreeting(input)
	return err
}

func buildGreetingInput(assetsDir string, spec ResolvedGreeting, current store.Greeting) (store.Greeting, error) {
	input := store.Greeting{
		ID:             store.GreetingKind(spec.ID),
		Enabled:        spec.Enabled,
		SplashTemplate: spec.SplashTemplate,
		Sound:          spec.Sound,
		DurationMs:     normalizeDurationMs(spec.DurationMs),
		SoundFile:      current.SoundFile,
		SoundVolume:    store.NormalizeCatalogSoundVolume(spec.SoundVolume),
		Layout:         store.NormalizeCatalogLayout(spec.Layout),
		ImageFit:       store.NormalizeCatalogImageFit(spec.ImageFit),
		ImageSizePct:   store.NormalizeCatalogImageSizePct(spec.ImageSizePct),
		ImageAsset:     current.ImageAsset,
	}

	if spec.SoundFile != "" {
		input.SoundFile = spec.SoundFile
	}

	if spec.ImagePath != "" {
		data, err := os.ReadFile(spec.ImagePath)
		if err != nil {
			return store.Greeting{}, errors.Errorf("read image %s: %w", spec.ImagePath, err)
		}
		assetName, err := overlayassets.Save(assetsDir, overlayassets.KindAlertImage, data)
		if err != nil {
			return store.Greeting{}, errors.Errorf("save image for greeting %s: %w", spec.ID, err)
		}
		input.ImageAsset = assetName
	}

	if spec.AudioPath != "" {
		data, err := os.ReadFile(spec.AudioPath)
		if err != nil {
			return store.Greeting{}, errors.Errorf("read audio %s: %w", spec.AudioPath, err)
		}
		assetName, err := overlayassets.Save(assetsDir, overlayassets.KindAlertSound, data)
		if err != nil {
			return store.Greeting{}, errors.Errorf("save audio for greeting %s: %w", spec.ID, err)
		}
		input.SoundFile = assetName
	}

	return input, nil
}

func greetingMatchesPack(current store.Greeting, spec ResolvedGreeting) bool {
	if current.Enabled != spec.Enabled ||
		current.SplashTemplate != spec.SplashTemplate ||
		current.Sound != spec.Sound ||
		current.DurationMs != normalizeDurationMs(spec.DurationMs) ||
		current.SoundVolume != store.NormalizeCatalogSoundVolume(spec.SoundVolume) ||
		current.Layout != store.NormalizeCatalogLayout(spec.Layout) ||
		current.ImageFit != store.NormalizeCatalogImageFit(spec.ImageFit) ||
		current.ImageSizePct != store.NormalizeCatalogImageSizePct(spec.ImageSizePct) {
		return false
	}

	return soundMatchesGreeting(current.SoundFile, spec) && imageMatchesGreeting(current.ImageAsset, spec)
}

func soundMatchesGreeting(currentSoundFile string, spec ResolvedGreeting) bool {
	if spec.AudioPath != "" {
		return currentSoundFile != ""
	}
	if spec.SoundFile != "" {
		return currentSoundFile == spec.SoundFile
	}
	return true
}

func imageMatchesGreeting(currentImageAsset string, spec ResolvedGreeting) bool {
	if spec.ImagePath != "" {
		return currentImageAsset != ""
	}
	return true
}
