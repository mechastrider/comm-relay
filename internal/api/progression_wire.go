package api

import (
	"encoding/json"
	"time"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/observability"
	"github.com/mechastrider/comm-relay/internal/store"
)

const wireViewerProgressionType = "viewer_progression"

type wireViewerProgression struct {
	Type          string                    `json:"type"`
	CreatedAt     string                    `json:"created_at"`
	ViewerID      string                    `json:"viewer_id"`
	DisplayName   string                    `json:"display_name"`
	AvatarURL     string                    `json:"avatar_url,omitempty"`
	PreviousLevel *progressionLevelResponse `json:"previous_level,omitempty"`
	Level         *progressionLevelResponse `json:"level,omitempty"`
	Achievements  []wireAchievementUnlock   `json:"achievements,omitempty"`
	Layout        string                    `json:"layout"`
	Sound         string                    `json:"sound,omitempty"`
	SoundVolume   int                       `json:"sound_volume"`
	DurationMs    int                       `json:"duration_ms"`
}

type wireAchievementUnlock struct {
	ID            string `json:"id"`
	AchievementID string `json:"achievement_id"`
	Revision      int    `json:"revision"`
	Occurrence    int    `json:"occurrence"`
	ProgressValue int    `json:"progress_value"`
	Name          string `json:"name"`
	Description   string `json:"description"`
	Backfilled    bool   `json:"backfilled,omitempty"`
	UnlockedAt    string `json:"unlocked_at"`
}

func wireUnlocks(items []store.AchievementUnlock) []wireAchievementUnlock {
	result := make([]wireAchievementUnlock, 0, len(items))
	for _, item := range items {
		result = append(result, wireAchievementUnlock{ID: item.ID, AchievementID: item.AchievementID, Revision: item.Revision, Occurrence: item.Occurrence, ProgressValue: item.ProgressValue, Name: item.Name, Description: item.Description, Backfilled: item.Backfilled, UnlockedAt: item.UnlockedAt.UTC().Format(time.RFC3339Nano)})
	}
	return result
}

func viewerProgressionWirePayload(viewerID, displayName, avatarURL string, bundle store.ProgressionResultBundle, levelEligible bool, unlocks []store.AchievementUnlock, settings *store.ProgressionAlertSettings) ([]byte, bool, error) {
	levelChanged := levelEligible && bundle.PreviousLevel != nil && bundle.CurrentLevel != nil && bundle.PreviousLevel.ID != bundle.CurrentLevel.ID
	if !levelChanged && len(unlocks) == 0 {
		return nil, false, nil
	}
	frame := wireViewerProgression{Type: wireViewerProgressionType, CreatedAt: time.Now().UTC().Format(time.RFC3339Nano), ViewerID: viewerID, DisplayName: displayName, AvatarURL: avatarURL, Achievements: wireUnlocks(unlocks), Layout: settings.Layout, Sound: settings.Sound, SoundVolume: settings.SoundVolume, DurationMs: settings.DurationMs}
	if levelChanged {
		previous := progressionLevelFromStore(*bundle.PreviousLevel)
		current := progressionLevelFromStore(*bundle.CurrentLevel)
		frame.PreviousLevel, frame.Level = &previous, &current
	}
	payload, err := json.Marshal(frame)
	if err != nil {
		return nil, false, errors.Errorf("marshal viewer progression wire event: %w", err)
	}
	return payload, true, nil
}

func progressionLivePayload(viewerStore *store.Store, viewerID string, dayResetHour int, customAvatarsEnabled bool, bundle store.ProgressionResultBundle) ([]byte, bool, error) {
	if viewerStore == nil {
		return nil, false, nil
	}
	for _, evaluation := range bundle.Evaluations {
		observability.Default.RecordProgressionEvaluation(string(evaluation.CauseMetric), len(evaluation.Unlocks), evaluation.Backfilled)
	}
	viewer, err := viewerStore.Get(viewerID, dayResetHour, time.Now())
	if err != nil {
		return nil, false, errors.Errorf("read viewer progression alert exclusion: %w", err)
	}
	settings, err := viewerStore.GetProgressionAlertSettings()
	if err != nil {
		return nil, false, errors.Errorf("read progression alert settings: %w", err)
	}
	if viewer.ProgressionAlertsDisabled {
		observability.Default.RecordProgressionSuppressed("viewer_opt_out")
		return nil, false, nil
	}
	levelEligible := settings.LevelEnabled && bundle.CurrentLevel != nil && bundle.CurrentLevel.Announce
	announcedUnlocks := make([]store.AchievementUnlock, 0, len(bundle.Unlocks))
	if settings.AchievementEnabled {
		for _, unlock := range bundle.Unlocks {
			definition, err := viewerStore.GetAchievement(unlock.AchievementID)
			if err != nil {
				return nil, false, errors.Errorf("read unlocked achievement alert eligibility: %w", err)
			}
			if definition.Announce {
				announcedUnlocks = append(announcedUnlocks, unlock)
			}
		}
	}
	payload, send, payloadErr := viewerProgressionWirePayload(viewerID, viewer.DisplayName, store.ViewerPortraitURL(*viewer, customAvatarsEnabled), bundle, levelEligible, announcedUnlocks, settings)
	if !send && payloadErr == nil {
		observability.Default.RecordProgressionSuppressed("gated_or_empty")
	}
	return payload, send, payloadErr
}
