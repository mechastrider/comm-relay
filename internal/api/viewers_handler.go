package api

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/overlayassets"
	"github.com/mechastrider/comm-relay/internal/recap"
	"github.com/mechastrider/comm-relay/internal/store"
)

type viewersHandler struct {
	viewerStore *store.Store
	cfgStore    *config.Store
	publisher   *LeaderboardPublisher
	recap       *recap.Controller
	assetsDir   string
}

func newViewersHandler(
	viewerStore *store.Store,
	cfgStore *config.Store,
	publisher *LeaderboardPublisher,
	recapController *recap.Controller,
) *viewersHandler {
	assetsDir := ""
	if cfgStore != nil {
		assetsDir = overlayassets.DirForConfig(cfgStore.Path())
	}
	return &viewersHandler{
		viewerStore: viewerStore,
		cfgStore:    cfgStore,
		publisher:   publisher,
		recap:       recapController,
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
	ID                        string                     `json:"id"`
	DisplayName               string                     `json:"display_name"`
	AvatarURL                 string                     `json:"avatar_url,omitempty"`
	CustomAvatar              string                     `json:"custom_avatar,omitempty"`
	LeaderboardHidden         bool                       `json:"leaderboard_hidden,omitempty"`
	GreetingsDisabled         bool                       `json:"greetings_disabled"`
	ProgressionAlertsDisabled bool                       `json:"progression_alerts_disabled"`
	MessageCount              int                        `json:"message_count"`
	XP                        int                        `json:"xp"`
	SessionMessageCount       int                        `json:"session_message_count"`
	SessionXP                 int                        `json:"session_xp"`
	DayMessageCount           int                        `json:"day_message_count"`
	DayXP                     int                        `json:"day_xp"`
	LastSeenAt                string                     `json:"last_seen_at"`
	LastSeen                  lastSeenResponse           `json:"last_seen"`
	Platforms                 []string                   `json:"platforms"`
	Identities                []viewerIdentityResponse   `json:"identities,omitempty"`
	CurrentLevel              *progressionLevelResponse  `json:"current_level,omitempty"`
	Progression               *viewerProgressionResponse `json:"progression,omitempty"`
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
		ID:                        viewer.ID,
		DisplayName:               viewer.DisplayName,
		AvatarURL:                 store.ViewerPortraitURL(viewer, customAvatarsEnabled),
		LeaderboardHidden:         viewer.LeaderboardHidden,
		GreetingsDisabled:         viewer.GreetingsDisabled,
		ProgressionAlertsDisabled: viewer.ProgressionAlertsDisabled,
		MessageCount:              viewer.MessageCount,
		XP:                        viewer.XP,
		SessionMessageCount:       viewer.SessionMessageCount,
		SessionXP:                 viewer.SessionXP,
		DayMessageCount:           viewer.DayMessageCount,
		DayXP:                     viewer.DayXP,
		LastSeenAt:                viewer.LastSeenAt.UTC().Format(time.RFC3339),
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
		item := viewerSummaryFromStore(viewer, false, customAvatarsEnabled)
		level, levelErr := h.viewerStore.ViewerProgressionLevel(viewer.ID)
		if levelErr != nil {
			clog.Errorf(r.Context(), "resolve viewer progression level: %w", levelErr)
			writeError(w, http.StatusInternalServerError, "failed to list viewers")
			return
		}
		levelResponse := progressionLevelFromStore(*level)
		item.CurrentLevel = &levelResponse
		out = append(out, item)
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
	response := viewerSummaryFromStore(*viewer, true, customAvatarsEnabled)
	progress, err := h.viewerStore.GetViewerProgression(viewer.ID)
	if err != nil {
		clog.Errorf(r.Context(), "get viewer progression: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to get viewer")
		return
	}
	progressResponse := viewerProgressionFromStore(progress)
	response.Progression = &progressResponse
	response.CurrentLevel = progressResponse.CurrentLevel
	writeJSON(w, http.StatusOK, response)
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
	ID                        string  `json:"id"`
	DisplayName               *string `json:"display_name"`
	LeaderboardHidden         *bool   `json:"leaderboard_hidden"`
	GreetingsDisabled         *bool   `json:"greetings_disabled"`
	ProgressionAlertsDisabled *bool   `json:"progression_alerts_disabled"`
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
	if request.DisplayName == nil && request.LeaderboardHidden == nil && request.GreetingsDisabled == nil && request.ProgressionAlertsDisabled == nil {
		writeJSON(w, http.StatusOK, map[string]bool{"updated": true})
		return
	}

	flushLeaderboard := false
	if request.DisplayName != nil {
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
	}
	if request.LeaderboardHidden != nil {
		err := h.viewerStore.UpdateLeaderboardHidden(request.ID, *request.LeaderboardHidden)
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "viewer not found")
			return
		}
		if err != nil {
			clog.Errorf(r.Context(), "update viewer leaderboard hidden: %w", err)
			writeError(w, http.StatusInternalServerError, "failed to update viewer")
			return
		}
		flushLeaderboard = true
	}
	if request.GreetingsDisabled != nil {
		if err := h.viewerStore.UpdateGreetingsDisabled(request.ID, *request.GreetingsDisabled); err != nil {
			if errors.Is(err, store.ErrNotFound) {
				writeError(w, http.StatusNotFound, "viewer not found")
				return
			}
			clog.Errorf(r.Context(), "update viewer greeting exclusion: %w", err)
			writeError(w, http.StatusInternalServerError, "failed to update viewer")
			return
		}
	}
	if request.ProgressionAlertsDisabled != nil {
		if err := h.viewerStore.UpdateProgressionAlertsDisabled(request.ID, *request.ProgressionAlertsDisabled); err != nil {
			if errors.Is(err, store.ErrNotFound) {
				writeError(w, http.StatusNotFound, "viewer not found")
				return
			}
			clog.Errorf(r.Context(), "update viewer progression alert exclusion: %w", err)
			writeError(w, http.StatusInternalServerError, "failed to update viewer")
			return
		}
	}

	if flushLeaderboard && h.publisher != nil {
		h.publisher.FlushNow()
	}

	writeJSON(w, http.StatusOK, map[string]bool{"updated": true})
}

func resolvedLeaderboardLimit(cfg config.Config, queryLimit string) int {
	limit := cfg.Overlay.ResolvedPreset(cfg.Overlay.ActivePresetID).LeaderboardMaxEntries()
	raw := strings.TrimSpace(queryLimit)
	if raw == "" {
		return limit
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil || parsed < config.OverlayLeaderboardMaxEntriesMin || parsed > config.OverlayLeaderboardMaxEntriesMax {
		return limit
	}
	return parsed
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

	if h.recap != nil {
		h.recap.HideOnNewStream()
	}

	if h.publisher != nil {
		h.publisher.FlushNow()
	}

	writeJSON(w, http.StatusOK, map[string]bool{"started": true})
}

type leaderboardEntryResponse struct {
	Rank         int                       `json:"rank"`
	DisplayName  string                    `json:"display_name"`
	AvatarURL    string                    `json:"avatar_url,omitempty"`
	XP           int                       `json:"xp"`
	MessageCount int                       `json:"message_count"`
	Level        *progressionLevelResponse `json:"level,omitempty"`
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

	cfg := h.cfgStore.Snapshot()
	customAvatarsEnabled := cfg.CustomAvatarsEnabled
	limit := resolvedLeaderboardLimit(cfg, r.URL.Query().Get("limit"))
	entries, err := h.viewerStore.Leaderboard(period, limit, dayResetHour, now, customAvatarsEnabled)
	if err != nil {
		clog.Errorf(r.Context(), "leaderboard %s: %w", period, err)
		writeError(w, http.StatusInternalServerError, "failed to load leaderboard")
		return
	}

	out := make([]leaderboardEntryResponse, 0, len(entries))
	for _, entry := range entries {
		response := leaderboardEntryResponse{
			Rank:         entry.Rank,
			DisplayName:  entry.DisplayName,
			AvatarURL:    entry.AvatarURL,
			XP:           entry.XP,
			MessageCount: entry.MessageCount,
		}
		if entry.Level != nil {
			level := progressionLevelFromStore(*entry.Level)
			response.Level = &level
		}
		out = append(out, response)
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
