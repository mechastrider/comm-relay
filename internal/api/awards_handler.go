package api

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/command"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/store"
)

type awardsHandler struct {
	viewerStore          *store.Store
	hub                  *Hub
	leaderboardPublisher *LeaderboardPublisher
	configStore          *config.Store
}

func newAwardsHandler(
	viewerStore *store.Store,
	hub *Hub,
	leaderboardPublisher *LeaderboardPublisher,
	configStore *config.Store,
) *awardsHandler {
	return &awardsHandler{
		viewerStore:          viewerStore,
		hub:                  hub,
		leaderboardPublisher: leaderboardPublisher,
		configStore:          configStore,
	}
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

type grantAwardRequest struct {
	Platform  string `json:"platform"`
	UserID    string `json:"user_id"`
	AwardID   string `json:"award_id"`
	MessageID string `json:"message_id,omitempty"`
}

type grantAwardResponse struct {
	ViewerID string `json:"viewer_id"`
	Points   int    `json:"points"`
}

func (h *awardsHandler) handleGrant(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}
	if h.hub == nil {
		writeError(w, http.StatusServiceUnavailable, "websocket hub unavailable")
		return
	}
	if h.configStore == nil {
		writeError(w, http.StatusServiceUnavailable, "config store unavailable")
		return
	}

	var request grantAwardRequest
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	platform := strings.TrimSpace(request.Platform)
	userID := strings.TrimSpace(request.UserID)
	awardID := strings.TrimSpace(request.AwardID)
	if platform == "" || userID == "" {
		writeError(w, http.StatusBadRequest, "platform and user_id are required")
		return
	}
	if awardID == "" {
		writeError(w, http.StatusBadRequest, "award_id is required")
		return
	}

	award, err := h.viewerStore.GetAward(awardID)
	if errors.Is(err, store.ErrAwardNotFound) {
		writeError(w, http.StatusBadRequest, "award not found")
		return
	}
	if err != nil {
		clog.Errorf(r.Context(), "get award: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to load award")
		return
	}

	cfg := h.configStore.Snapshot()
	now := time.Now()
	result, err := h.viewerStore.ApplyAward(store.ChatIdentity{
		Platform: platform,
		UserID:   userID,
	}, award.Points, cfg.DayResetHour, now)
	if errors.Is(err, store.ErrInvalidIdentity) {
		writeError(w, http.StatusBadRequest, "platform and user_id are required")
		return
	}
	if err != nil {
		clog.Errorf(r.Context(), "apply award: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to grant award")
		return
	}

	name := command.DisplayName(result.Username, result.DisplayName)
	if strings.TrimSpace(name) == "" {
		name = userID
	}
	text := command.SubstituteTemplate(award.SplashTemplate, name, award.Points)
	alertPayload, err := awardAlertWirePayload(award, name, result.AvatarURL, text, award.Points)
	if err != nil {
		clog.Errorf(r.Context(), "award alert wire payload: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to broadcast alert")
		return
	}

	h.hub.Broadcast(alertPayload)
	if h.leaderboardPublisher != nil {
		h.leaderboardPublisher.Schedule()
	}

	event := store.AppendInteractionEventInput{
		Kind:     store.InteractionEventAward,
		ViewerID: result.ViewerID,
		AwardID:  award.ID,
		Points:   award.Points,
		Now:      now,
	}
	if messageID := strings.TrimSpace(request.MessageID); messageID != "" {
		event.MessagePlatform = platform
		event.MessageID = messageID
	}
	if err := h.viewerStore.AppendInteractionEvent(event); err != nil {
		clog.Errorf(r.Context(), "append award interaction event: %w", err)
	}

	writeJSON(w, http.StatusOK, grantAwardResponse{
		ViewerID: result.ViewerID,
		Points:   award.Points,
	})
}
