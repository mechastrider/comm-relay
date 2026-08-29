package api

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/store"
)

type awardsHandler struct {
	viewerStore *store.Store
}

func newAwardsHandler(viewerStore *store.Store) *awardsHandler {
	return &awardsHandler{viewerStore: viewerStore}
}

type awardResponse struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Points         int    `json:"points"`
	SplashTemplate string `json:"splash_template"`
	Sound          string `json:"sound"`
	DurationMs     int    `json:"duration_ms"`
	ImageAsset     string `json:"image_asset,omitempty"`
	SoundFile      string `json:"sound_file,omitempty"`
}

type awardsListResponse struct {
	Awards []awardResponse `json:"awards"`
}

func awardFromStore(award store.AwardType) awardResponse {
	resp := awardResponse{
		ID:             award.ID,
		Name:           award.Name,
		Points:         award.Points,
		SplashTemplate: award.SplashTemplate,
		Sound:          award.Sound,
		DurationMs:     award.DurationMs,
	}
	if award.ImageAsset != "" {
		resp.ImageAsset = award.ImageAsset
	}
	if award.SoundFile != "" {
		resp.SoundFile = award.SoundFile
	}

	return resp
}

func (h *awardsHandler) handleList(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}

	awards, err := h.viewerStore.ListAwards()
	if err != nil {
		clog.Errorf(r.Context(), "list awards: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to list awards")
		return
	}

	out := make([]awardResponse, 0, len(awards))
	for _, award := range awards {
		out = append(out, awardFromStore(award))
	}

	writeJSON(w, http.StatusOK, awardsListResponse{Awards: out})
}

type createAwardRequest struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Points         int    `json:"points"`
	SplashTemplate string `json:"splash_template"`
	Sound          string `json:"sound"`
	DurationMs     int    `json:"duration_ms"`
}

func (h *awardsHandler) handleCreate(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}

	var request createAwardRequest
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	award, err := h.viewerStore.CreateAward(store.CreateAwardInput{
		ID:             request.ID,
		Name:           request.Name,
		Points:         request.Points,
		SplashTemplate: request.SplashTemplate,
		Sound:          request.Sound,
		DurationMs:     request.DurationMs,
	})
	if errors.Is(err, store.ErrInvalidPoints) {
		writeFieldErrors(w, http.StatusBadRequest, "Check the highlighted fields.", map[string]string{
			"points": "points must be at least 1",
		})
		return
	}
	if err != nil {
		clog.Errorf(r.Context(), "create award: %w", err)
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, awardFromStore(*award))
}

type updateAwardRequest struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Points         int    `json:"points"`
	SplashTemplate string `json:"splash_template"`
	Sound          string `json:"sound"`
	DurationMs     int    `json:"duration_ms"`
}

func (h *awardsHandler) handleUpdate(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}

	var request updateAwardRequest
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

	award, err := h.viewerStore.UpdateAward(store.UpdateAwardInput{
		ID:             request.ID,
		Name:           request.Name,
		Points:         request.Points,
		SplashTemplate: request.SplashTemplate,
		Sound:          request.Sound,
		DurationMs:     request.DurationMs,
	})
	if errors.Is(err, store.ErrAwardNotFound) {
		writeError(w, http.StatusNotFound, "award not found")
		return
	}
	if errors.Is(err, store.ErrInvalidPoints) {
		writeFieldErrors(w, http.StatusBadRequest, "Check the highlighted fields.", map[string]string{
			"points": "points must be at least 1",
		})
		return
	}
	if err != nil {
		clog.Errorf(r.Context(), "update award: %w", err)
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, awardFromStore(*award))
}

type deleteAwardRequest struct {
	ID string `json:"id"`
}

func (h *awardsHandler) handleDelete(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}

	var request deleteAwardRequest
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

	err := h.viewerStore.DeleteAward(request.ID)
	if errors.Is(err, store.ErrAwardNotFound) {
		writeError(w, http.StatusNotFound, "award not found")
		return
	}
	if err != nil {
		clog.Errorf(r.Context(), "delete award: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to delete award")
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}
