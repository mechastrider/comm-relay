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

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/recap"
	"github.com/mechastrider/comm-relay/internal/store"
)

type streamRecapsHandler struct {
	viewerStore *store.Store
	configStore *config.Store
	controller  *recap.Controller
}

func newStreamRecapsHandler(
	viewerStore *store.Store,
	configStore *config.Store,
	controller *recap.Controller,
) *streamRecapsHandler {
	return &streamRecapsHandler{
		viewerStore: viewerStore,
		configStore: configStore,
		controller:  controller,
	}
}

type streamRecapCurrentResponse struct {
	SessionID string                `json:"session_id"`
	Session   sessionDetailResponse `json:"session"`
	Visible   bool                  `json:"visible"`
	Snapshot  *recap.Snapshot       `json:"snapshot"`
}

type streamRecapShowResponse struct {
	Visible  bool            `json:"visible"`
	Snapshot *recap.Snapshot `json:"snapshot"`
}

type streamRecapHideResponse struct {
	Visible bool `json:"visible"`
}

type streamRecapShowRequest struct {
	SessionID string `json:"session_id"`
}

func (h *streamRecapsHandler) handleCurrent(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}
	if h.controller == nil {
		writeError(w, http.StatusServiceUnavailable, "stream recap unavailable")
		return
	}

	sessionID, err := h.viewerStore.CurrentSessionID()
	if errors.Is(err, store.ErrSessionNotFound) {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}
	if err != nil {
		clog.Errorf(r.Context(), "load current session for recap: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to load stream recap")
		return
	}

	customAvatarsEnabled := false
	if h.configStore != nil {
		customAvatarsEnabled = h.configStore.Snapshot().CustomAvatarsEnabled
	}

	detail, err := h.viewerStore.GetSession(sessionID, customAvatarsEnabled)
	if err != nil {
		clog.Errorf(r.Context(), "load current session detail for recap: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to load stream recap")
		return
	}

	var storedSnapshot *recap.Snapshot
	if detail.HasRecap {
		storedSnapshot, err = h.viewerStore.LoadStreamRecap(sessionID)
		if errors.Is(err, store.ErrRecapNotFound) {
			storedSnapshot = nil
		} else if errors.Is(err, store.ErrRecapPayloadInvalid) {
			clog.Errorf(r.Context(), "load stored stream recap: %w", err)
			writeError(w, http.StatusInternalServerError, "failed to load stream recap")
			return
		} else if err != nil {
			clog.Errorf(r.Context(), "load stored stream recap: %w", err)
			writeError(w, http.StatusInternalServerError, "failed to load stream recap")
			return
		}
	}

	state := h.controller.Current()
	writeJSON(w, http.StatusOK, streamRecapCurrentResponse{
		SessionID: sessionID,
		Session:   sessionDetailFromStore(detail, storedSnapshot),
		Visible:   state.Visible,
		Snapshot:  storedSnapshot,
	})
}

func (h *streamRecapsHandler) handleShow(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}
	if h.controller == nil {
		writeError(w, http.StatusServiceUnavailable, "stream recap unavailable")
		return
	}

	var request streamRecapShowRequest
	if !decodeStreamRecapAction(w, r, &request) {
		return
	}
	sessionID := strings.TrimSpace(request.SessionID)
	if sessionID == "" {
		writeError(w, http.StatusBadRequest, "invalid stream recap request")
		return
	}

	customAvatarsEnabled := false
	if h.configStore != nil {
		customAvatarsEnabled = h.configStore.Snapshot().CustomAvatarsEnabled
	}

	snapshot, err := h.viewerStore.CaptureStreamRecap(r.Context(), sessionID, customAvatarsEnabled)
	if errors.Is(err, store.ErrRecapSessionConflict) {
		writeError(w, http.StatusConflict, "stream recap session conflict")
		return
	}
	if errors.Is(err, store.ErrRecapPayloadInvalid) {
		clog.Errorf(r.Context(), "capture stream recap payload invalid",
			slog.String("session_id", sessionID),
		)
		writeError(w, http.StatusInternalServerError, "failed to show stream recap")
		return
	}
	if err != nil {
		clog.Errorf(r.Context(), "capture stream recap: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to show stream recap")
		return
	}

	clog.Info(r.Context(), "stream recap captured",
		slog.String("session_id", sessionID),
		slog.String("snapshot_id", snapshot.ID),
	)

	state := h.controller.Show(snapshot)

	writeJSON(w, http.StatusOK, streamRecapShowResponse{
		Visible:  state.Visible,
		Snapshot: state.Snapshot,
	})
}

func (h *streamRecapsHandler) handleHide(w http.ResponseWriter, r *http.Request) {
	if h.controller == nil {
		writeError(w, http.StatusServiceUnavailable, "stream recap unavailable")
		return
	}
	if !decodeStreamRecapAction(w, r, &struct{}{}) {
		return
	}

	state := h.controller.Hide()

	writeJSON(w, http.StatusOK, streamRecapHideResponse{Visible: state.Visible})
}

func decodeStreamRecapAction(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(io.LimitReader(r.Body, 4096))
	decoder.DisallowUnknownFields()
	err := decoder.Decode(target)
	if errors.Is(err, io.EOF) {
		return true
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return false
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return false
	}
	return true
}

type sessionTotalsResponse struct {
	ViewerCount  int `json:"viewer_count"`
	MessageCount int `json:"message_count"`
	XP           int `json:"xp"`
}

type sessionRankingResponse struct {
	Rank         int    `json:"rank"`
	DisplayName  string `json:"display_name"`
	PortraitURL  string `json:"portrait_url,omitempty"`
	XP           int    `json:"xp"`
	MessageCount int    `json:"message_count"`
	Title        string `json:"title,omitempty"`
}

type sessionAchievementGroupResponse struct {
	ViewerDisplayName string `json:"viewer_display_name"`
	ViewerPortraitURL string `json:"viewer_portrait_url,omitempty"`
	AchievementID     string `json:"achievement_id"`
	Revision          int    `json:"revision"`
	Name              string `json:"name"`
	Description       string `json:"description"`
	Count             int    `json:"count"`
	LatestUnlockedAt  string `json:"unlocked_at"`
}

type sessionSummaryResponse struct {
	ID        string                `json:"id"`
	StartedAt string                `json:"started_at"`
	EndedAt   *string               `json:"ended_at"`
	IsCurrent bool                  `json:"is_current"`
	HasRecap  bool                  `json:"has_recap"`
	Totals    sessionTotalsResponse `json:"totals"`
}

type sessionDetailResponse struct {
	ID                string                            `json:"id"`
	StartedAt         string                            `json:"started_at"`
	EndedAt           *string                           `json:"ended_at"`
	IsCurrent         bool                              `json:"is_current"`
	HasRecap          bool                              `json:"has_recap"`
	Totals            sessionTotalsResponse             `json:"totals"`
	Ranking           []sessionRankingResponse          `json:"ranking"`
	AchievementGroups []sessionAchievementGroupResponse `json:"achievement_groups"`
	Snapshot          *recap.Snapshot                   `json:"snapshot,omitempty"`
}

func sessionSummaryFromStore(summary store.SessionSummary) sessionSummaryResponse {
	response := sessionSummaryResponse{
		ID:        summary.ID,
		StartedAt: formatSessionTime(summary.StartedAt),
		IsCurrent: summary.IsCurrent,
		HasRecap:  summary.HasRecap,
		Totals: sessionTotalsResponse{
			ViewerCount:  summary.Totals.ViewerCount,
			MessageCount: summary.Totals.MessageCount,
			XP:           summary.Totals.XP,
		},
	}
	if summary.EndedAt != nil {
		formatted := formatSessionTime(*summary.EndedAt)
		response.EndedAt = &formatted
	}
	return response
}

func sessionDetailFromStore(detail *store.SessionDetail, snapshot *recap.Snapshot) sessionDetailResponse {
	if detail == nil {
		return sessionDetailResponse{}
	}
	response := sessionDetailResponse{
		ID:        detail.ID,
		StartedAt: formatSessionTime(detail.StartedAt),
		IsCurrent: detail.IsCurrent,
		HasRecap:  detail.HasRecap,
		Totals: sessionTotalsResponse{
			ViewerCount:  detail.Totals.ViewerCount,
			MessageCount: detail.Totals.MessageCount,
			XP:           detail.Totals.XP,
		},
		Ranking:           make([]sessionRankingResponse, 0, len(detail.Ranking)),
		AchievementGroups: make([]sessionAchievementGroupResponse, 0, len(detail.AchievementGroups)),
		Snapshot:          snapshot,
	}
	if detail.EndedAt != nil {
		formatted := formatSessionTime(*detail.EndedAt)
		response.EndedAt = &formatted
	}
	for _, entry := range detail.Ranking {
		response.Ranking = append(response.Ranking, sessionRankingResponse{
			Rank:         entry.Rank,
			DisplayName:  entry.DisplayName,
			PortraitURL:  entry.PortraitURL,
			XP:           entry.XP,
			MessageCount: entry.MessageCount,
			Title:        entry.Title,
		})
	}
	for _, group := range detail.AchievementGroups {
		response.AchievementGroups = append(response.AchievementGroups, sessionAchievementGroupResponse{
			ViewerDisplayName: group.ViewerDisplayName,
			ViewerPortraitURL: group.ViewerPortraitURL,
			AchievementID:     group.AchievementID,
			Revision:          group.Revision,
			Name:              group.Name,
			Description:       group.Description,
			Count:             group.Count,
			LatestUnlockedAt:  formatSessionTime(group.LatestUnlockedAt),
		})
	}
	return response
}

func formatSessionTime(value time.Time) string {
	return value.UTC().Format(time.RFC3339Nano)
}

func loadStoredSessionSnapshot(viewerStore *store.Store, sessionID string, hasRecap bool) (*recap.Snapshot, error) {
	if !hasRecap {
		return nil, nil
	}
	snapshot, err := viewerStore.LoadStreamRecap(sessionID)
	if errors.Is(err, store.ErrRecapNotFound) {
		return nil, nil
	}
	return snapshot, err
}
