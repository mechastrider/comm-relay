package api

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/store"
)

type progressionHandler struct {
	viewerStore *store.Store
	hub         *Hub
}

func newProgressionHandler(viewerStore *store.Store, hub *Hub) *progressionHandler {
	return &progressionHandler{viewerStore: viewerStore, hub: hub}
}

type progressionLevelResponse struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	MinXP    int    `json:"min_xp"`
	Announce bool   `json:"announce"`
}

func progressionLevelFromStore(level store.ProgressionLevel) progressionLevelResponse {
	return progressionLevelResponse{ID: level.ID, Title: level.Title, MinXP: level.MinXP, Announce: level.Announce}
}

type progressionAlertSettingsResponse struct {
	AchievementEnabled bool      `json:"achievement_enabled"`
	LevelEnabled       bool      `json:"level_enabled"`
	Layout             string    `json:"layout"`
	Sound              string    `json:"sound"`
	SoundVolume        int       `json:"sound_volume"`
	DurationMs         int       `json:"duration_ms"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

func progressionAlertSettingsFromStore(settings store.ProgressionAlertSettings) progressionAlertSettingsResponse {
	return progressionAlertSettingsResponse{
		AchievementEnabled: settings.AchievementEnabled,
		LevelEnabled:       settings.LevelEnabled,
		Layout:             settings.Layout,
		Sound:              settings.Sound,
		SoundVolume:        settings.SoundVolume,
		DurationMs:         settings.DurationMs,
		CreatedAt:          settings.CreatedAt,
		UpdatedAt:          settings.UpdatedAt,
	}
}

type progressionReconciliationStatusResponse struct {
	BootstrapState      string    `json:"bootstrap_state"`
	RequestedGeneration int       `json:"requested_generation"`
	CompletedGeneration int       `json:"completed_generation"`
	State               string    `json:"state"`
	LastViewerID        string    `json:"last_viewer_id"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

func progressionReconciliationStatusFromStore(status store.ProgressionReconciliationStatus) progressionReconciliationStatusResponse {
	return progressionReconciliationStatusResponse{
		BootstrapState:      status.BootstrapState,
		RequestedGeneration: status.RequestedGeneration,
		CompletedGeneration: status.CompletedGeneration,
		State:               status.Status,
		LastViewerID:        status.LastViewerID,
		CreatedAt:           status.CreatedAt,
		UpdatedAt:           status.UpdatedAt,
	}
}

type achievementRevisionResponse struct {
	Metric       string `json:"metric"`
	SubjectID    string `json:"subject_id,omitempty"`
	SubjectLabel string `json:"subject_label,omitempty"`
	Target       int    `json:"target"`
	Repeatable   bool   `json:"repeatable"`
}

type achievementResponse struct {
	ID             string                      `json:"id"`
	Name           string                      `json:"name"`
	Description    string                      `json:"description"`
	Enabled        bool                        `json:"enabled"`
	Secret         bool                        `json:"secret"`
	Announce       bool                        `json:"announce"`
	ActiveRevision int                         `json:"active_revision"`
	Revision       achievementRevisionResponse `json:"revision"`
}

func achievementFromStore(item store.AchievementDefinition) achievementResponse {
	return achievementResponse{ID: item.ID, Name: item.Name, Description: item.Description, Enabled: item.Enabled, Secret: item.Secret, Announce: item.Announce, ActiveRevision: item.ActiveRevision, Revision: achievementRevisionResponse{Metric: string(item.Revision.Metric), SubjectID: item.Revision.SubjectID, SubjectLabel: item.Revision.SubjectLabel, Target: item.Revision.Target, Repeatable: item.Revision.Repeatable}}
}

func (h *progressionHandler) available(w http.ResponseWriter) bool {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return false
	}
	return true
}

func (h *progressionHandler) handleLevels(w http.ResponseWriter, r *http.Request) {
	if !h.available(w) {
		return
	}
	levels, err := h.viewerStore.ListProgressionLevels()
	if err != nil {
		progressionServerError(w, r, "list levels", err)
		return
	}
	response := make([]progressionLevelResponse, 0, len(levels))
	for _, level := range levels {
		response = append(response, progressionLevelFromStore(level))
	}
	writeJSON(w, http.StatusOK, map[string]any{"levels": response})
}

func (h *progressionHandler) handleAchievements(w http.ResponseWriter, r *http.Request) {
	if !h.available(w) {
		return
	}
	items, err := h.viewerStore.ListAchievements()
	if err != nil {
		progressionServerError(w, r, "list achievements", err)
		return
	}
	response := make([]achievementResponse, 0, len(items))
	for _, item := range items {
		response = append(response, achievementFromStore(item))
	}
	writeJSON(w, http.StatusOK, map[string]any{"achievements": response})
}

func (h *progressionHandler) handleSettings(w http.ResponseWriter, r *http.Request) {
	if !h.available(w) {
		return
	}
	settings, err := h.viewerStore.GetProgressionAlertSettings()
	if err != nil {
		progressionServerError(w, r, "get progression settings", err)
		return
	}
	writeJSON(w, http.StatusOK, progressionAlertSettingsFromStore(*settings))
}

func (h *progressionHandler) handleStatus(w http.ResponseWriter, r *http.Request) {
	if !h.available(w) {
		return
	}
	status, err := h.viewerStore.GetProgressionReconciliationStatus()
	if err != nil {
		progressionServerError(w, r, "get progression status", err)
		return
	}
	writeJSON(w, http.StatusOK, progressionReconciliationStatusFromStore(*status))
}

type progressionLevelRequest struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	MinXP    int    `json:"min_xp"`
	Announce bool   `json:"announce"`
}
type progressionAchievementRequest struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	Enabled      bool   `json:"enabled"`
	Secret       bool   `json:"secret"`
	Announce     bool   `json:"announce"`
	Metric       string `json:"metric"`
	SubjectID    string `json:"subject_id"`
	SubjectLabel string `json:"subject_label"`
	Target       int    `json:"target"`
	Repeatable   bool   `json:"repeatable"`
}
type progressionSettingsRequest struct {
	AchievementEnabled bool   `json:"achievement_enabled"`
	LevelEnabled       bool   `json:"level_enabled"`
	Layout             string `json:"layout"`
	Sound              string `json:"sound"`
	SoundVolume        int    `json:"sound_volume"`
	DurationMs         int    `json:"duration_ms"`
}
type progressionIDRequest struct {
	ID string `json:"id"`
}

func decodeProgressionRequest[T any](w http.ResponseWriter, r *http.Request) (T, bool) {
	var request T
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil || rejectTrailingJSON(decoder) != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return request, false
	}
	return request, true
}

func progressionServerError(w http.ResponseWriter, r *http.Request, action string, err error) {
	clog.Errorf(r.Context(), "%s: %w", action, err)
	writeError(w, http.StatusInternalServerError, "progression request failed")
}

func progressionMutationError(w http.ResponseWriter, r *http.Request, action string, err error) {
	switch {
	case errors.Is(err, store.ErrProgressionLevelNotFound), errors.Is(err, store.ErrAchievementNotFound), errors.Is(err, store.ErrNotFound):
		writeError(w, http.StatusNotFound, "progression resource not found")
	case errors.Is(err, store.ErrProgressionValidation), errors.Is(err, store.ErrBaselineLevel):
		writeError(w, http.StatusBadRequest, "invalid progression request")
	default:
		progressionServerError(w, r, action, err)
	}
}

func (h *progressionHandler) handleLevelCreate(w http.ResponseWriter, r *http.Request) {
	if !h.available(w) {
		return
	}
	request, ok := decodeProgressionRequest[progressionLevelRequest](w, r)
	if !ok {
		return
	}
	item, err := h.viewerStore.CreateProgressionLevel(store.CreateProgressionLevelInput{ID: request.ID, Title: request.Title, MinXP: request.MinXP, Announce: request.Announce, Now: time.Now()})
	if err != nil {
		progressionMutationError(w, r, "create progression level", err)
		return
	}
	writeJSON(w, http.StatusOK, progressionLevelFromStore(*item))
}

func (h *progressionHandler) handleLevelUpdate(w http.ResponseWriter, r *http.Request) {
	if !h.available(w) {
		return
	}
	request, ok := decodeProgressionRequest[progressionLevelRequest](w, r)
	if !ok {
		return
	}
	item, err := h.viewerStore.UpdateProgressionLevel(store.UpdateProgressionLevelInput{ID: request.ID, Title: request.Title, MinXP: request.MinXP, Announce: request.Announce, Now: time.Now()})
	if err != nil {
		progressionMutationError(w, r, "update progression level", err)
		return
	}
	writeJSON(w, http.StatusOK, progressionLevelFromStore(*item))
}

func (h *progressionHandler) handleLevelDelete(w http.ResponseWriter, r *http.Request) {
	if !h.available(w) {
		return
	}
	request, ok := decodeProgressionRequest[progressionIDRequest](w, r)
	if !ok {
		return
	}
	if err := h.viewerStore.DeleteProgressionLevel(request.ID); err != nil {
		progressionMutationError(w, r, "delete progression level", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

func achievementInput(request progressionAchievementRequest) store.CreateAchievementInput {
	return store.CreateAchievementInput{ID: request.ID, Name: request.Name, Description: request.Description, Enabled: request.Enabled, Secret: request.Secret, Announce: request.Announce, Metric: store.ProgressionMetric(strings.TrimSpace(request.Metric)), SubjectID: request.SubjectID, SubjectLabel: request.SubjectLabel, Target: request.Target, Repeatable: request.Repeatable, Now: time.Now()}
}

func (h *progressionHandler) handleAchievementCreate(w http.ResponseWriter, r *http.Request) {
	if !h.available(w) {
		return
	}
	request, ok := decodeProgressionRequest[progressionAchievementRequest](w, r)
	if !ok {
		return
	}
	item, err := h.viewerStore.CreateAchievement(achievementInput(request))
	if err != nil {
		progressionMutationError(w, r, "create achievement", err)
		return
	}
	writeJSON(w, http.StatusOK, achievementFromStore(*item))
}

func (h *progressionHandler) handleAchievementUpdate(w http.ResponseWriter, r *http.Request) {
	if !h.available(w) {
		return
	}
	request, ok := decodeProgressionRequest[progressionAchievementRequest](w, r)
	if !ok {
		return
	}
	item, err := h.viewerStore.UpdateAchievement(achievementInput(request))
	if err != nil {
		progressionMutationError(w, r, "update achievement", err)
		return
	}
	writeJSON(w, http.StatusOK, achievementFromStore(*item))
}

func (h *progressionHandler) handleAchievementDelete(w http.ResponseWriter, r *http.Request) {
	if !h.available(w) {
		return
	}
	request, ok := decodeProgressionRequest[progressionIDRequest](w, r)
	if !ok {
		return
	}
	if err := h.viewerStore.DeleteAchievement(request.ID, time.Now()); err != nil {
		progressionMutationError(w, r, "delete achievement", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

func (h *progressionHandler) handleSettingsUpdate(w http.ResponseWriter, r *http.Request) {
	if !h.available(w) {
		return
	}
	request, ok := decodeProgressionRequest[progressionSettingsRequest](w, r)
	if !ok {
		return
	}
	settings, err := h.viewerStore.UpdateProgressionAlertSettings(store.ProgressionAlertSettings{AchievementEnabled: request.AchievementEnabled, LevelEnabled: request.LevelEnabled, Layout: request.Layout, Sound: request.Sound, SoundVolume: request.SoundVolume, DurationMs: request.DurationMs}, time.Now())
	if err != nil {
		progressionMutationError(w, r, "update progression settings", err)
		return
	}
	writeJSON(w, http.StatusOK, progressionAlertSettingsFromStore(*settings))
}

func (h *progressionHandler) handleReconcile(w http.ResponseWriter, r *http.Request) {
	if !h.available(w) {
		return
	}
	status, err := h.viewerStore.RequestProgressionReconciliation(time.Now())
	if err != nil {
		progressionServerError(w, r, "request progression reconciliation", err)
		return
	}
	writeJSON(w, http.StatusOK, progressionReconciliationStatusFromStore(*status))
}

type progressionPreviewRequest struct {
	Kind        string `json:"kind"`
	DisplayName string `json:"display_name"`
	AvatarURL   string `json:"avatar_url"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Title       string `json:"title"`
	Layout      string `json:"layout"`
	Sound       string `json:"sound"`
	SoundVolume *int   `json:"sound_volume"`
	DurationMs  *int   `json:"duration_ms"`
}

func (h *progressionHandler) handlePreview(w http.ResponseWriter, r *http.Request) {
	if h.hub == nil {
		writeError(w, http.StatusServiceUnavailable, "progression preview unavailable")
		return
	}
	request, ok := decodeProgressionRequest[progressionPreviewRequest](w, r)
	if !ok {
		return
	}
	kind := strings.TrimSpace(request.Kind)
	volume, duration := 70, 5000
	if request.SoundVolume != nil {
		volume = *request.SoundVolume
	}
	if request.DurationMs != nil {
		duration = *request.DurationMs
	}
	if (kind != "achievement" && kind != "level") || len([]rune(request.DisplayName)) > 64 || len([]rune(request.Name)) > 64 || len([]rune(request.Title)) > 64 || len([]rune(request.Description)) > 240 || volume < 0 || volume > 100 || duration < 1 || duration > 120_000 {
		writeError(w, http.StatusBadRequest, "invalid progression preview")
		return
	}
	settings := &store.ProgressionAlertSettings{Layout: strings.TrimSpace(request.Layout), Sound: strings.TrimSpace(request.Sound), SoundVolume: volume, DurationMs: duration}
	if settings.Layout == "" {
		settings.Layout = "card"
	}
	if err := store.ValidateProgressionAlertSettings(*settings); err != nil {
		writeError(w, http.StatusBadRequest, "invalid progression preview")
		return
	}
	name := strings.TrimSpace(request.DisplayName)
	if name == "" {
		name = "Studio Tester"
	}
	bundle := store.ProgressionResultBundle{}
	levelEligible := kind == "level"
	var unlocks []store.AchievementUnlock
	if kind == "level" {
		bundle.PreviousLevel = &store.ProgressionLevel{ID: "preview_previous", Title: "Previous title", MinXP: 0}
		bundle.CurrentLevel = &store.ProgressionLevel{ID: "preview_level", Title: strings.TrimSpace(request.Title), MinXP: 100, Announce: true}
		if bundle.CurrentLevel.Title == "" {
			bundle.CurrentLevel.Title = "Veteran"
		}
	} else {
		unlocks = []store.AchievementUnlock{{ID: "preview_achievement", AchievementID: "preview_achievement", Revision: 1, Occurrence: 1, ProgressValue: 1, Name: strings.TrimSpace(request.Name), Description: strings.TrimSpace(request.Description), UnlockedAt: time.Now()}}
		if unlocks[0].Name == "" {
			unlocks[0].Name = "First contact"
		}
	}
	payload, send, err := viewerProgressionWirePayload("preview-viewer", name, strings.TrimSpace(request.AvatarURL), bundle, levelEligible, unlocks, settings)
	if err != nil {
		progressionServerError(w, r, "build progression preview", err)
		return
	}
	if !send {
		writeError(w, http.StatusBadRequest, "invalid progression preview")
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"delivered_clients": h.hub.BroadcastDebug(payload)})
}

type viewerProgressionAchievementResponse struct {
	Achievement achievementResponse `json:"achievement"`
	Value       int                 `json:"value"`
	Occurrences int                 `json:"occurrences"`
}
type viewerProgressionResponse struct {
	ViewerID     string                                 `json:"viewer_id"`
	XP           int                                    `json:"xp"`
	CurrentLevel *progressionLevelResponse              `json:"current_level,omitempty"`
	NextLevel    *progressionLevelResponse              `json:"next_level,omitempty"`
	Achievements []viewerProgressionAchievementResponse `json:"achievements"`
	Unlocks      []wireAchievementUnlock                `json:"unlocks"`
}

func viewerProgressionFromStore(progress *store.ViewerProgression) viewerProgressionResponse {
	response := viewerProgressionResponse{
		ViewerID:     progress.ViewerID,
		XP:           progress.XP,
		Achievements: []viewerProgressionAchievementResponse{},
		Unlocks:      wireUnlocks(progress.Unlocks),
	}
	if progress.CurrentLevel != nil {
		level := progressionLevelFromStore(*progress.CurrentLevel)
		response.CurrentLevel = &level
	}
	if progress.NextLevel != nil {
		level := progressionLevelFromStore(*progress.NextLevel)
		response.NextLevel = &level
	}
	for _, item := range progress.Achievements {
		if item.Definition.Secret && item.Occurrences == 0 {
			continue
		}
		response.Achievements = append(response.Achievements, viewerProgressionAchievementResponse{
			Achievement: achievementFromStore(item.Definition),
			Value:       item.Value,
			Occurrences: item.Occurrences,
		})
	}
	return response
}

func (h *progressionHandler) handleViewer(w http.ResponseWriter, r *http.Request) {
	if !h.available(w) {
		return
	}
	viewerID := strings.TrimSpace(r.URL.Query().Get("id"))
	if viewerID == "" {
		writeError(w, http.StatusBadRequest, "id is required")
		return
	}
	progress, err := h.viewerStore.GetViewerProgression(viewerID)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "viewer not found")
		return
	}
	if err != nil {
		progressionServerError(w, r, "get viewer progression", err)
		return
	}
	writeJSON(w, http.StatusOK, viewerProgressionFromStore(progress))
}
