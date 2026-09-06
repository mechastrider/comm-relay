package api

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/store"
)

type commandsHandler struct {
	viewerStore *store.Store
}

func newCommandsHandler(viewerStore *store.Store) *commandsHandler {
	return &commandsHandler{viewerStore: viewerStore}
}

type commandResponse struct {
	ID              string `json:"id"`
	Action          string `json:"action"`
	Trigger         string `json:"trigger"`
	Enabled         bool   `json:"enabled"`
	CooldownSeconds int    `json:"cooldown_seconds"`
	SplashTemplate  string `json:"splash_template"`
	Sound           string `json:"sound"`
	DurationMs      int    `json:"duration_ms"`
	ImageAsset      string `json:"image_asset,omitempty"`
	SoundFile       string `json:"sound_file,omitempty"`
	SoundVolume     int    `json:"sound_volume"`
	Layout          string `json:"layout"`
	ImageFit        string `json:"image_fit"`
	ImageSizePct    int    `json:"image_size_pct"`
}

type commandsListResponse struct {
	Commands []commandResponse `json:"commands"`
}

func commandFromStore(cmd store.Command) commandResponse {
	resp := commandResponse{
		ID:              cmd.ID,
		Action:          cmd.Action,
		Trigger:         cmd.Trigger,
		Enabled:         cmd.Enabled,
		CooldownSeconds: cmd.CooldownSeconds,
		SplashTemplate:  cmd.SplashTemplate,
		Sound:           cmd.Sound,
		DurationMs:      cmd.DurationMs,
	}
	if cmd.ImageAsset != "" {
		resp.ImageAsset = cmd.ImageAsset
	}
	if cmd.SoundFile != "" {
		resp.SoundFile = cmd.SoundFile
	}
	resp.SoundVolume = cmd.SoundVolume
	resp.Layout = cmd.Layout
	resp.ImageFit = cmd.ImageFit
	resp.ImageSizePct = cmd.ImageSizePct

	return resp
}

func (h *commandsHandler) handleList(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}

	commands, err := h.viewerStore.ListCommands()
	if err != nil {
		clog.Errorf(r.Context(), "list commands: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to list commands")
		return
	}

	out := make([]commandResponse, 0, len(commands))
	for _, cmd := range commands {
		out = append(out, commandFromStore(cmd))
	}

	writeJSON(w, http.StatusOK, commandsListResponse{Commands: out})
}

type createCommandRequest struct {
	ID              string `json:"id"`
	Action          string `json:"action,omitempty"`
	Trigger         string `json:"trigger"`
	Enabled         bool   `json:"enabled"`
	CooldownSeconds int    `json:"cooldown_seconds"`
	SplashTemplate  string `json:"splash_template"`
	Sound           string `json:"sound"`
	DurationMs      int    `json:"duration_ms"`
	ImageAsset      string `json:"image_asset,omitempty"`
	SoundFile       string `json:"sound_file,omitempty"`
	SoundVolume     *int   `json:"sound_volume,omitempty"`
	Layout          string `json:"layout,omitempty"`
	ImageFit        string `json:"image_fit,omitempty"`
	ImageSizePct    *int   `json:"image_size_pct,omitempty"`
}

func (h *commandsHandler) handleCreate(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}

	var request createCommandRequest
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	cmd, err := h.viewerStore.CreateCommand(store.CreateCommandInput{
		ID:              request.ID,
		Action:          request.Action,
		Trigger:         request.Trigger,
		Enabled:         request.Enabled,
		CooldownSeconds: request.CooldownSeconds,
		SplashTemplate:  request.SplashTemplate,
		Sound:           request.Sound,
		DurationMs:      request.DurationMs,
		ImageAsset:      request.ImageAsset,
		SoundFile:       request.SoundFile,
		SoundVolume:     catalogSoundVolumeFromRequest(request.SoundVolume),
		Layout:          request.Layout,
		ImageFit:        request.ImageFit,
		ImageSizePct:    catalogImageSizePctFromRequest(request.ImageSizePct),
	})
	if fields := store.CatalogMediaFields(err); len(fields) > 0 {
		writeFieldErrors(w, http.StatusBadRequest, "Check the highlighted fields.", fields)
		return
	}
	if errors.Is(err, store.ErrDuplicateTrigger) {
		writeFieldErrors(w, http.StatusBadRequest, "Check the highlighted fields.", map[string]string{
			"trigger": "trigger already exists",
		})
		return
	}
	if errors.Is(err, store.ErrInvalidTrigger) {
		writeFieldErrors(w, http.StatusBadRequest, "Check the highlighted fields.", map[string]string{
			"trigger": "invalid trigger",
		})
		return
	}
	if errors.Is(err, store.ErrInvalidCommandAction) {
		writeFieldErrors(w, http.StatusBadRequest, "Check the highlighted fields.", map[string]string{
			"action": "choose alert or show leaderboard",
		})
		return
	}
	if err != nil {
		clog.Errorf(r.Context(), "create command: %w", err)
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, commandFromStore(*cmd))
}

type updateCommandRequest struct {
	ID              string `json:"id"`
	Action          string `json:"action,omitempty"`
	Trigger         string `json:"trigger"`
	Enabled         bool   `json:"enabled"`
	CooldownSeconds int    `json:"cooldown_seconds"`
	SplashTemplate  string `json:"splash_template"`
	Sound           string `json:"sound"`
	DurationMs      int    `json:"duration_ms"`
	ImageAsset      string `json:"image_asset,omitempty"`
	SoundFile       string `json:"sound_file,omitempty"`
	SoundVolume     *int   `json:"sound_volume,omitempty"`
	Layout          string `json:"layout,omitempty"`
	ImageFit        string `json:"image_fit,omitempty"`
	ImageSizePct    *int   `json:"image_size_pct,omitempty"`
}

func (h *commandsHandler) handleUpdate(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}

	var request updateCommandRequest
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if request.ID == "" {
		writeError(w, http.StatusBadRequest, "id is required")
		return
	}

	cmd, err := h.viewerStore.UpdateCommand(store.UpdateCommandInput{
		ID:              request.ID,
		Action:          request.Action,
		Trigger:         request.Trigger,
		Enabled:         request.Enabled,
		CooldownSeconds: request.CooldownSeconds,
		SplashTemplate:  request.SplashTemplate,
		Sound:           request.Sound,
		DurationMs:      request.DurationMs,
		ImageAsset:      request.ImageAsset,
		SoundFile:       request.SoundFile,
		SoundVolume:     catalogSoundVolumeFromRequest(request.SoundVolume),
		Layout:          request.Layout,
		ImageFit:        request.ImageFit,
		ImageSizePct:    catalogImageSizePctFromRequest(request.ImageSizePct),
	})
	if fields := store.CatalogMediaFields(err); len(fields) > 0 {
		writeFieldErrors(w, http.StatusBadRequest, "Check the highlighted fields.", fields)
		return
	}
	if errors.Is(err, store.ErrCommandNotFound) {
		writeError(w, http.StatusNotFound, "command not found")
		return
	}
	if errors.Is(err, store.ErrDuplicateTrigger) {
		writeFieldErrors(w, http.StatusBadRequest, "Check the highlighted fields.", map[string]string{
			"trigger": "trigger already exists",
		})
		return
	}
	if errors.Is(err, store.ErrInvalidTrigger) {
		writeFieldErrors(w, http.StatusBadRequest, "Check the highlighted fields.", map[string]string{
			"trigger": "invalid trigger",
		})
		return
	}
	if errors.Is(err, store.ErrInvalidCommandAction) {
		writeFieldErrors(w, http.StatusBadRequest, "Check the highlighted fields.", map[string]string{
			"action": "choose alert or show leaderboard",
		})
		return
	}
	if err != nil {
		clog.Errorf(r.Context(), "update command: %w", err)
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, commandFromStore(*cmd))
}

type deleteCommandRequest struct {
	ID string `json:"id"`
}

func (h *commandsHandler) handleDelete(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}

	var request deleteCommandRequest
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if request.ID == "" {
		writeError(w, http.StatusBadRequest, "id is required")
		return
	}

	err := h.viewerStore.DeleteCommand(request.ID)
	if errors.Is(err, store.ErrCommandNotFound) {
		writeError(w, http.StatusNotFound, "command not found")
		return
	}
	if err != nil {
		clog.Errorf(r.Context(), "delete command: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to delete command")
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}
