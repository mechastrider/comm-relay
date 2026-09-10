package api

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/command"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/leaderboard"
	"github.com/mechastrider/comm-relay/internal/observability"
	"github.com/mechastrider/comm-relay/internal/store"
)

type viewerContractsHandler struct {
	viewerStore          *store.Store
	hub                  *Hub
	configStore          *config.Store
	leaderboardPublisher *LeaderboardPublisher
	visibility           *leaderboard.Controller
	presentation         *viewerContractPresentation
}

func newViewerContractsHandler(
	viewerStore *store.Store,
	hub *Hub,
	configStore *config.Store,
	leaderboardPublisher *LeaderboardPublisher,
	visibility *leaderboard.Controller,
	presentation *viewerContractPresentation,
) *viewerContractsHandler {
	return &viewerContractsHandler{
		viewerStore:          viewerStore,
		hub:                  hub,
		configStore:          configStore,
		leaderboardPublisher: leaderboardPublisher,
		visibility:           visibility,
		presentation:         presentation,
	}
}

type viewerContractResponse struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	Objective    string `json:"objective"`
	RewardID     string `json:"reward_id"`
	RewardName   string `json:"reward_name"`
	RewardPoints int    `json:"reward_points"`
	AnnouncedAt  string `json:"announced_at"`
}

type currentViewerContractResponse struct {
	Contract *viewerContractResponse `json:"contract"`
	Content  string                  `json:"content"`
	Visible  bool                    `json:"visible"`
}

func viewerContractFromStore(contract *store.ViewerContract) *viewerContractResponse {
	if contract == nil {
		return nil
	}
	return &viewerContractResponse{
		ID:           contract.ID,
		Title:        contract.Title,
		Objective:    contract.Objective,
		RewardID:     contract.RewardID,
		RewardName:   contract.RewardName,
		RewardPoints: contract.RewardPoints,
		AnnouncedAt:  contract.AnnouncedAt.UTC().Format(time.RFC3339Nano),
	}
}

func (h *viewerContractsHandler) handleCurrent(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}

	contract, err := h.viewerStore.CurrentViewerContract()
	if errors.Is(err, store.ErrViewerContractNotFound) {
		writeJSON(w, http.StatusOK, currentViewerContractResponse{Content: contractContentContract})
		return
	}
	if err != nil {
		clog.Errorf(r.Context(), "load current viewer contract: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to load current contract")
		return
	}

	snapshot := h.presentation.Current()
	writeJSON(w, http.StatusOK, currentViewerContractResponse{
		Contract: viewerContractFromStore(contract),
		Content:  snapshot.Content,
		Visible:  snapshot.Visible,
	})
}

type openViewerContractRequest struct {
	Title     string `json:"title"`
	Objective string `json:"objective"`
	RewardID  string `json:"reward_id"`
}

func (h *viewerContractsHandler) handleOpen(w http.ResponseWriter, r *http.Request) {
	if !h.requireLifecycleDependencies(w) {
		return
	}

	var request openViewerContractRequest
	if !decodeViewerContractRequest(w, r, &request) {
		return
	}

	now := time.Now()
	contract, err := h.viewerStore.OpenViewerContract(store.OpenViewerContractInput{
		Title:     request.Title,
		Objective: request.Objective,
		RewardID:  request.RewardID,
		Now:       now,
	})
	if h.writeOpenError(w, r, err) {
		return
	}
	snapshot := h.presentation.Activate(contract)
	if !h.broadcastContractState(w, r, snapshot) {
		return
	}
	if !h.broadcastContractAnnouncement(w, r, contract, now) {
		return
	}

	clog.Info(r.Context(), "viewer contract opened",
		slog.String("contract_id", contract.ID),
		slog.String("reward_id", contract.RewardID),
	)
	writeJSON(w, http.StatusOK, currentViewerContractResponse{
		Contract: viewerContractFromStore(contract), Content: snapshot.Content, Visible: snapshot.Visible,
	})
}

type displayViewerContractRequest struct {
	ID      string `json:"id"`
	Content string `json:"content"`
	Visible bool   `json:"visible"`
}

func (h *viewerContractsHandler) handleDisplay(w http.ResponseWriter, r *http.Request) {
	if !h.requireLifecycleDependencies(w) {
		return
	}
	if h.presentation == nil {
		writeError(w, http.StatusServiceUnavailable, "contract presentation unavailable")
		return
	}

	var request displayViewerContractRequest
	if !decodeViewerContractRequest(w, r, &request) {
		return
	}
	request.ID = strings.TrimSpace(request.ID)
	request.Content = strings.TrimSpace(request.Content)
	if request.ID == "" || (request.Content != contractContentContract && request.Content != contractContentLeaderboard) {
		writeError(w, http.StatusBadRequest, "id and valid content are required")
		return
	}
	if _, err := h.viewerStore.ActiveViewerContract(request.ID); err != nil {
		if errors.Is(err, store.ErrViewerContractConflict) {
			clog.Debug(r.Context(), "viewer contract display rejected", "contract_id", request.ID)
			writeError(w, http.StatusConflict, "contract is no longer active")
			return
		}
		clog.Errorf(r.Context(), "load viewer contract for display: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to load contract")
		return
	}

	snapshot, ok := h.presentation.Update(request.ID, request.Content, request.Visible)
	if !ok {
		clog.Debug(r.Context(), "viewer contract display rejected after state change", "contract_id", request.ID)
		writeError(w, http.StatusConflict, "contract is no longer active")
		return
	}
	if !h.broadcastContractState(w, r, snapshot) {
		return
	}
	clog.Info(r.Context(), "viewer contract display changed",
		slog.String("contract_id", request.ID),
		slog.String("content", request.Content),
		slog.Bool("visible", request.Visible),
	)
	writeJSON(w, http.StatusOK, snapshot)
}

type announceViewerContractRequest struct {
	ID string `json:"id"`
}

func (h *viewerContractsHandler) handleAnnounce(w http.ResponseWriter, r *http.Request) {
	if !h.requireLifecycleDependencies(w) {
		return
	}

	var request announceViewerContractRequest
	if !decodeViewerContractRequest(w, r, &request) {
		return
	}

	contract, err := h.viewerStore.ActiveViewerContract(request.ID)
	if errors.Is(err, store.ErrViewerContractConflict) {
		clog.Debug(r.Context(), "viewer contract announce rejected", "contract_id", strings.TrimSpace(request.ID))
		writeError(w, http.StatusConflict, "contract is no longer active")
		return
	}
	if err != nil {
		clog.Errorf(r.Context(), "reload viewer contract for announcement: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to load contract")
		return
	}

	now := time.Now()
	if !h.broadcastContractAnnouncement(w, r, contract, now) {
		return
	}
	clog.Info(r.Context(), "viewer contract announced again", slog.String("contract_id", contract.ID))
	snapshot := h.presentation.Current()
	writeJSON(w, http.StatusOK, currentViewerContractResponse{
		Contract: viewerContractFromStore(contract), Content: snapshot.Content, Visible: snapshot.Visible,
	})
}

func (h *viewerContractsHandler) requireLifecycleDependencies(w http.ResponseWriter) bool {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return false
	}
	if h.hub == nil {
		writeError(w, http.StatusServiceUnavailable, "websocket hub unavailable")
		return false
	}
	return true
}

func (h *viewerContractsHandler) requireSettlementDependencies(w http.ResponseWriter) bool {
	if !h.requireLifecycleDependencies(w) {
		return false
	}
	if h.configStore == nil {
		writeError(w, http.StatusServiceUnavailable, "config store unavailable")
		return false
	}
	return true
}

func decodeViewerContractRequest(w http.ResponseWriter, r *http.Request, request any) bool {
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return false
	}
	return true
}

func (h *viewerContractsHandler) writeOpenError(w http.ResponseWriter, r *http.Request, err error) bool {
	if err == nil {
		return false
	}
	switch {
	case errors.Is(err, store.ErrInvalidViewerContract):
		writeError(w, http.StatusBadRequest, "title, objective, and reward_id are required")
	case errors.Is(err, store.ErrAwardNotFound):
		writeError(w, http.StatusBadRequest, "award not found")
	case errors.Is(err, store.ErrViewerContractConflict):
		clog.Debug(r.Context(), "viewer contract open rejected because another contract is active")
		writeError(w, http.StatusConflict, "another contract is active")
	default:
		clog.Errorf(r.Context(), "open viewer contract: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to open contract")
	}
	return true
}

func (h *viewerContractsHandler) broadcastContractAnnouncement(
	w http.ResponseWriter,
	r *http.Request,
	contract *store.ViewerContract,
	now time.Time,
) bool {
	payload, err := contractAlertWirePayload(contract, now)
	if err != nil {
		clog.Errorf(r.Context(), "encode viewer contract announcement: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to announce contract")
		return false
	}
	h.hub.Broadcast(payload)
	return true
}

func (h *viewerContractsHandler) broadcastContractState(
	w http.ResponseWriter,
	r *http.Request,
	snapshot viewerContractPresentationSnapshot,
) bool {
	payload, err := viewerContractStateWirePayload(snapshot)
	if err != nil {
		clog.Errorf(r.Context(), "encode viewer contract state: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to update contract display")
		return false
	}
	h.hub.Broadcast(payload)
	return true
}

type awardViewerContractRequest struct {
	ID       string `json:"id"`
	ViewerID string `json:"viewer_id"`
}

type awardViewerContractResponse struct {
	ContractID string `json:"contract_id"`
	ViewerID   string `json:"viewer_id"`
	Points     int    `json:"points"`
}

func (h *viewerContractsHandler) handleAward(w http.ResponseWriter, r *http.Request) {
	if !h.requireSettlementDependencies(w) {
		return
	}

	var request awardViewerContractRequest
	if !decodeViewerContractRequest(w, r, &request) {
		return
	}
	cfg := h.configStore.Snapshot()
	now := time.Now()
	result, err := h.viewerStore.AwardViewerContract(store.AwardViewerContractInput{
		ID:                   request.ID,
		ViewerID:             request.ViewerID,
		DayResetHour:         cfg.DayResetHour,
		CustomAvatarsEnabled: cfg.CustomAvatarsEnabled,
		Now:                  now,
	})
	if h.writeSettlementError(w, r, strings.TrimSpace(request.ID), err) {
		return
	}
	if !h.broadcastContractState(w, r, h.presentation.Clear(result.Contract.ID)) {
		return
	}

	award := awardTypeFromContract(result.Contract)
	viewerName := strings.TrimSpace(result.ViewerDisplayName)
	if viewerName == "" {
		viewerName = result.ViewerID
	}
	text := command.SubstituteTemplate(award.SplashTemplate, command.TemplateVars{
		Viewer:   viewerName,
		Streamer: cfg.StreamerDisplayName,
		Points:   award.Points,
	})
	payload, err := awardAlertWirePayload(&award, viewerName, result.ViewerAvatarURL, text, award.Points, now, awardAlertContext{})
	if err != nil {
		clog.Errorf(r.Context(), "encode viewer contract award alert: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to publish contract award")
		return
	}
	h.hub.Broadcast(payload)
	observability.Default.RecordAwardGranted()
	clog.Info(r.Context(), "viewer contract awarded",
		slog.String("contract_id", result.Contract.ID),
		slog.String("viewer_id", result.ViewerID),
		slog.String("reward_id", result.Contract.RewardID),
	)
	h.publishContractAwardLeaderboard(cfg, result, award.DurationMs)
	writeJSON(w, http.StatusOK, awardViewerContractResponse{
		ContractID: result.Contract.ID,
		ViewerID:   result.ViewerID,
		Points:     result.Contract.RewardPoints,
	})
}

func (h *viewerContractsHandler) publishContractAwardLeaderboard(
	cfg config.Config,
	result *store.AwardViewerContractResult,
	durationMs int,
) {
	if h.visibility != nil {
		delay := time.Duration(durationMs) * time.Millisecond
		switch {
		case cfg.LeaderboardVisibility.ShowOnAward:
			h.visibility.Schedule(leaderboard.ReasonAward, delay)
		case result.MeaningfulRankChange && cfg.LeaderboardVisibility.ShowOnRankChange:
			h.visibility.Schedule(leaderboard.ReasonRankChange, delay)
		default:
			h.visibility.MarkDirty()
		}
	}
	if h.leaderboardPublisher != nil {
		h.leaderboardPublisher.Schedule()
	}
}

func awardTypeFromContract(contract store.ViewerContract) store.AwardType {
	return store.AwardType{
		ID:             contract.RewardID,
		Name:           contract.RewardName,
		Points:         contract.RewardPoints,
		SplashTemplate: contract.RewardSplashTemplate,
		Sound:          contract.RewardSound,
		DurationMs:     contract.RewardDurationMs,
		ImageAsset:     contract.RewardImageAsset,
		SoundFile:      contract.RewardSoundFile,
		SoundVolume:    contract.RewardSoundVolume,
		Layout:         contract.RewardLayout,
		ImageFit:       contract.RewardImageFit,
		ImageSizePct:   contract.RewardImageSizePct,
	}
}

type closeViewerContractRequest struct {
	ID string `json:"id"`
}

type closeViewerContractResponse struct {
	ContractID string `json:"contract_id"`
	Closed     bool   `json:"closed"`
}

func (h *viewerContractsHandler) handleClose(w http.ResponseWriter, r *http.Request) {
	if !h.requireLifecycleDependencies(w) {
		return
	}

	var request closeViewerContractRequest
	if !decodeViewerContractRequest(w, r, &request) {
		return
	}
	if strings.TrimSpace(request.ID) == "" {
		writeError(w, http.StatusBadRequest, "id is required")
		return
	}
	contract, err := h.viewerStore.CloseViewerContract(request.ID, time.Now())
	if h.writeSettlementError(w, r, strings.TrimSpace(request.ID), err) {
		return
	}
	if !h.broadcastContractState(w, r, h.presentation.Clear(contract.ID)) {
		return
	}
	clog.Info(r.Context(), "viewer contract closed without result", slog.String("contract_id", contract.ID))
	writeJSON(w, http.StatusOK, closeViewerContractResponse{ContractID: contract.ID, Closed: true})
}

func (h *viewerContractsHandler) writeSettlementError(w http.ResponseWriter, r *http.Request, contractID string, err error) bool {
	if err == nil {
		return false
	}
	switch {
	case errors.Is(err, store.ErrInvalidViewerContract):
		writeError(w, http.StatusBadRequest, "id and viewer_id are required")
	case errors.Is(err, store.ErrNotFound):
		writeError(w, http.StatusNotFound, "viewer not found")
	case errors.Is(err, store.ErrViewerContractConflict):
		clog.Debug(r.Context(), "viewer contract settlement rejected", "contract_id", contractID)
		writeError(w, http.StatusConflict, "contract is no longer active")
	default:
		clog.Errorf(r.Context(), "settle viewer contract: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to settle contract")
	}
	return true
}
