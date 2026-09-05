package api

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/overlayassets"
	"github.com/mechastrider/comm-relay/internal/store"
)

type viewersHandler struct {
	viewerStore *store.Store
	cfgStore    *config.Store
	publisher   *LeaderboardPublisher
	assetsDir   string
}

func newViewersHandler(viewerStore *store.Store, cfgStore *config.Store, publisher *LeaderboardPublisher) *viewersHandler {
	assetsDir := ""
	if cfgStore != nil {
		assetsDir = overlayassets.DirForConfig(cfgStore.Path())
	}
	return &viewersHandler{
		viewerStore: viewerStore,
		cfgStore:    cfgStore,
		publisher:   publisher,
		assetsDir:   assetsDir,
	}
}

type viewerIdentityResponse struct {
	Platform    string `json:"platform"`
	UserID      string `json:"user_id"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name,omitempty"`
	AvatarURL   string `json:"avatar_url,omitempty"`
	LastSeenAt  string `json:"last_seen_at,omitempty"`
}

type lastSeenResponse struct {
	Platform  string `json:"platform"`
	UserID    string `json:"user_id"`
	Username  string `json:"username,omitempty"`
	AvatarURL string `json:"avatar_url,omitempty"`
}

type viewerSummaryResponse struct {
	ID                  string                   `json:"id"`
	DisplayName         string                   `json:"display_name"`
	AvatarURL           string                   `json:"avatar_url,omitempty"`
	CustomAvatar        string                   `json:"custom_avatar,omitempty"`
	MessageCount        int                      `json:"message_count"`
	XP                  int                      `json:"xp"`
	SessionMessageCount int                      `json:"session_message_count"`
	SessionXP           int                      `json:"session_xp"`
	DayMessageCount     int                      `json:"day_message_count"`
	DayXP               int                      `json:"day_xp"`
	LastSeenAt          string                   `json:"last_seen_at"`
	LastSeen            lastSeenResponse         `json:"last_seen"`
	Platforms           []string                 `json:"platforms"`
	Identities          []viewerIdentityResponse `json:"identities,omitempty"`
}

type viewersListResponse struct {
	Viewers []viewerSummaryResponse `json:"viewers"`
}

func viewerSummaryFromStore(viewer store.Viewer, includeIdentities bool, customAvatarsEnabled bool) viewerSummaryResponse {
	platforms := viewer.Platforms
	if platforms == nil {
		platforms = []string{}
	}

	resp := viewerSummaryResponse{
		ID:                  viewer.ID,
		DisplayName:         viewer.DisplayName,
		AvatarURL:           store.ViewerPortraitURL(viewer, customAvatarsEnabled),
		MessageCount:        viewer.MessageCount,
		XP:                  viewer.XP,
		SessionMessageCount: viewer.SessionMessageCount,
		SessionXP:           viewer.SessionXP,
		DayMessageCount:     viewer.DayMessageCount,
		DayXP:               viewer.DayXP,
		LastSeenAt:          viewer.LastSeenAt.UTC().Format(time.RFC3339),
		LastSeen: lastSeenResponse{
			Platform:  viewer.LastSeen.Platform,
			UserID:    viewer.LastSeen.UserID,
			Username:  viewer.LastSeen.Username,
			AvatarURL: viewer.LastSeen.AvatarURL,
		},
		Platforms: platforms,
	}

	if includeIdentities {
		resp.Identities = make([]viewerIdentityResponse, 0, len(viewer.Identities))
		for _, identity := range viewer.Identities {
			resp.Identities = append(resp.Identities, viewerIdentityResponse{
				Platform:    identity.Platform,
				UserID:      identity.UserID,
				Username:    identity.Username,
				DisplayName: identity.DisplayName,
				AvatarURL:   identity.AvatarURL,
				LastSeenAt:  identity.LastSeenAt.UTC().Format(time.RFC3339),
			})
		}
		if custom := strings.TrimSpace(viewer.CustomAvatar); custom != "" {
			resp.CustomAvatar = custom
		}
	}

	return resp
}

func (h *viewersHandler) statsNow() (int, time.Time) {
	cfg := h.cfgStore.Snapshot()
	return cfg.DayResetHour, time.Now()
}

func (h *viewersHandler) handleList(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}

	dayResetHour, now := h.statsNow()
	customAvatarsEnabled := true
	if h.cfgStore != nil {
		customAvatarsEnabled = h.cfgStore.Snapshot().CustomAvatarsEnabled
	}
	viewers, err := h.viewerStore.List(r.URL.Query().Get("q"), dayResetHour, now)
	if err != nil {
		clog.Errorf(r.Context(), "list viewers: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to list viewers")
		return
	}

	out := make([]viewerSummaryResponse, 0, len(viewers))
	for _, viewer := range viewers {
		out = append(out, viewerSummaryFromStore(viewer, false, customAvatarsEnabled))
	}

	writeJSON(w, http.StatusOK, viewersListResponse{Viewers: out})
}

func (h *viewersHandler) handleGet(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id is required")
		return
	}

	dayResetHour, now := h.statsNow()
	viewer, err := h.viewerStore.Get(id, dayResetHour, now)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "viewer not found")
		return
	}
	if err != nil {
		clog.Errorf(r.Context(), "get viewer: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to get viewer")
		return
	}

	customAvatarsEnabled := true
	if h.cfgStore != nil {
		customAvatarsEnabled = h.cfgStore.Snapshot().CustomAvatarsEnabled
	}
	writeJSON(w, http.StatusOK, viewerSummaryFromStore(*viewer, true, customAvatarsEnabled))
}

type mergeViewersRequest struct {
	FromID string `json:"from_id"`
	IntoID string `json:"into_id"`
}

func (h *viewersHandler) handleMerge(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}

	var request mergeViewersRequest
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if request.FromID == "" || request.IntoID == "" {
		writeError(w, http.StatusBadRequest, "from_id and into_id are required")
		return
	}

	dayResetHour, now := h.statsNow()
	err := h.viewerStore.Merge(request.FromID, request.IntoID, dayResetHour, now)
	if errors.Is(err, store.ErrSelfMerge) {
		writeError(w, http.StatusBadRequest, "cannot merge viewer into itself")
		return
	}
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "viewer not found")
		return
	}
	if err != nil {
		clog.Errorf(r.Context(), "merge viewers: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to merge viewers")
		return
	}

	if h.publisher != nil {
		h.publisher.FlushNow()
	}

	writeJSON(w, http.StatusOK, map[string]bool{"merged": true})
}

type updateViewerRequest struct {
	ID          string  `json:"id"`
	DisplayName *string `json:"display_name"`
}

func (h *viewersHandler) handleUpdate(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}

	var request updateViewerRequest
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
	if request.DisplayName == nil {
		writeJSON(w, http.StatusOK, map[string]bool{"updated": true})
		return
	}

	err := h.viewerStore.UpdateDisplayName(request.ID, *request.DisplayName)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "viewer not found")
		return
	}
	if err != nil {
		clog.Errorf(r.Context(), "update viewer display name: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to update viewer")
		return
	}

	if h.publisher != nil {
		h.publisher.Schedule()
	}

	writeJSON(w, http.StatusOK, map[string]bool{"updated": true})
}

func (h *viewersHandler) handleStartSession(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}

	if err := h.viewerStore.StartSession(time.Now()); err != nil {
		clog.Errorf(r.Context(), "start stream session: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to start session")
		return
	}

	if h.publisher != nil {
		h.publisher.FlushNow()
	}

	writeJSON(w, http.StatusOK, map[string]bool{"started": true})
}

type leaderboardEntryResponse struct {
	Rank         int    `json:"rank"`
	DisplayName  string `json:"display_name"`
	AvatarURL    string `json:"avatar_url,omitempty"`
	XP           int    `json:"xp"`
	MessageCount int    `json:"message_count"`
}

type leaderboardResponse struct {
	Period  string                     `json:"period"`
	Entries []leaderboardEntryResponse `json:"entries"`
}

func (h *viewersHandler) handleLeaderboard(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}

	period := storeNormalizePeriod(r.URL.Query().Get("period"))
	dayResetHour, now := h.statsNow()

	customAvatarsEnabled := true
	if h.cfgStore != nil {
		customAvatarsEnabled = h.cfgStore.Snapshot().CustomAvatarsEnabled
	}
	entries, err := h.viewerStore.Leaderboard(period, leaderboardWireLimit, dayResetHour, now, customAvatarsEnabled)
	if err != nil {
		clog.Errorf(r.Context(), "leaderboard %s: %w", period, err)
		writeError(w, http.StatusInternalServerError, "failed to load leaderboard")
		return
	}

	out := make([]leaderboardEntryResponse, 0, len(entries))
	for _, entry := range entries {
		out = append(out, leaderboardEntryResponse{
			Rank:         entry.Rank,
			DisplayName:  entry.DisplayName,
			AvatarURL:    entry.AvatarURL,
			XP:           entry.XP,
			MessageCount: entry.MessageCount,
		})
	}

	writeJSON(w, http.StatusOK, leaderboardResponse{
		Period:  period,
		Entries: out,
	})
}

func storeNormalizePeriod(period string) string {
	switch period {
	case "session", "day", "all":
		return period
	default:
		return "session"
	}
}
