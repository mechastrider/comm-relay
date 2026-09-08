package api

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/store"
)

type rewardHistoryHandler struct {
	viewerStore *store.Store
}

type rewardHistoryEntryResponse struct {
	ID                string `json:"id"`
	Kind              string `json:"kind"`
	ViewerID          string `json:"viewer_id"`
	ViewerDisplayName string `json:"viewer_display_name"`
	RewardID          string `json:"reward_id"`
	RewardName        string `json:"reward_name"`
	Points            int    `json:"points"`
	CreatedAt         string `json:"created_at"`
}

type rewardHistoryResponse struct {
	Entries    []rewardHistoryEntryResponse `json:"entries"`
	NextCursor string                       `json:"next_cursor,omitempty"`
}

func newRewardHistoryHandler(viewerStore *store.Store) *rewardHistoryHandler {
	return &rewardHistoryHandler{viewerStore: viewerStore}
}

func (h *rewardHistoryHandler) handleList(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}

	limit, err := parseRewardHistoryLimit(r.URL.Query().Get("limit"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid reward history request")
		return
	}
	page, err := h.viewerStore.ListRewardHistory(store.RewardHistoryQuery{
		ViewerID: strings.TrimSpace(r.URL.Query().Get("viewer_id")),
		Limit:    limit,
		Cursor:   r.URL.Query().Get("cursor"),
	})
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "viewer not found")
		return
	}
	if errors.Is(err, store.ErrInvalidRewardHistoryLimit) || errors.Is(err, store.ErrInvalidRewardHistoryCursor) {
		writeError(w, http.StatusBadRequest, "invalid reward history request")
		return
	}
	if err != nil {
		clog.Errorf(r.Context(), "list reward history: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to load reward history")
		return
	}

	entries := make([]rewardHistoryEntryResponse, 0, len(page.Entries))
	for _, entry := range page.Entries {
		entries = append(entries, rewardHistoryEntryResponse{
			ID:                entry.ID,
			Kind:              string(entry.Kind),
			ViewerID:          entry.ViewerID,
			ViewerDisplayName: entry.ViewerDisplayName,
			RewardID:          entry.RewardID,
			RewardName:        entry.RewardName,
			Points:            entry.Points,
			CreatedAt:         entry.CreatedAt.UTC().Format("2006-01-02T15:04:05.000000000Z"),
		})
	}
	writeJSON(w, http.StatusOK, rewardHistoryResponse{Entries: entries, NextCursor: page.NextCursor})
}

func parseRewardHistoryLimit(raw string) (int, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0, nil
	}
	limit, err := strconv.Atoi(raw)
	if err != nil {
		return 0, store.ErrInvalidRewardHistoryLimit
	}
	if limit < 1 || limit > 100 {
		return 0, store.ErrInvalidRewardHistoryLimit
	}
	return limit, nil
}
