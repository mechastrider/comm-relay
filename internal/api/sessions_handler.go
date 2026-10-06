package api

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/store"
	"github.com/mechastrider/comm-relay/internal/streamtitle"
)

type sessionsHandler struct {
	viewerStore *store.Store
	configStore *config.Store
}

func newSessionsHandler(viewerStore *store.Store, configStore *config.Store) *sessionsHandler {
	return &sessionsHandler{viewerStore: viewerStore, configStore: configStore}
}

type sessionsListResponse struct {
	Sessions   []sessionSummaryResponse `json:"sessions"`
	NextCursor string                   `json:"next_cursor,omitempty"`
}

func (h *sessionsHandler) handleList(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}

	limit, err := parseSessionListLimit(r.URL.Query().Get("limit"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid session list request")
		return
	}

	page, err := h.viewerStore.ListSessions(store.SessionsQuery{
		Limit:  limit,
		Cursor: r.URL.Query().Get("cursor"),
	})
	if errors.Is(err, store.ErrInvalidSessionListLimit) || errors.Is(err, store.ErrInvalidSessionCursor) {
		writeError(w, http.StatusBadRequest, "invalid session list request")
		return
	}
	if err != nil {
		clog.Errorf(r.Context(), "list sessions: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to load sessions")
		return
	}

	summaries := make([]sessionSummaryResponse, 0, len(page.Sessions))
	for _, summary := range page.Sessions {
		summaries = append(summaries, sessionSummaryFromStore(summary))
	}
	writeJSON(w, http.StatusOK, sessionsListResponse{Sessions: summaries, NextCursor: page.NextCursor})
}

func (h *sessionsHandler) handleGet(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}

	sessionID := strings.TrimSpace(r.URL.Query().Get("id"))
	if sessionID == "" {
		writeError(w, http.StatusBadRequest, "invalid session request")
		return
	}

	customAvatarsEnabled := false
	if h.configStore != nil {
		customAvatarsEnabled = h.configStore.Snapshot().CustomAvatarsEnabled
	}

	detail, err := h.viewerStore.GetSession(sessionID, customAvatarsEnabled)
	if errors.Is(err, store.ErrSessionNotFound) {
		writeError(w, http.StatusNotFound, "session not found")
		return
	}
	if err != nil {
		clog.Errorf(r.Context(), "load session detail: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to load session")
		return
	}

	snapshot, err := loadStoredSessionSnapshot(h.viewerStore, sessionID, detail.HasRecap)
	if errors.Is(err, store.ErrRecapPayloadInvalid) {
		clog.Errorf(r.Context(), "load session recap snapshot: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to load session")
		return
	}
	if err != nil {
		clog.Errorf(r.Context(), "load session recap snapshot: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to load session")
		return
	}

	writeJSON(w, http.StatusOK, sessionDetailFromStore(detail, snapshot))
}

type titleSuggestionResponse struct {
	Title    string `json:"title"`
	Platform string `json:"platform,omitempty"`
}

func (h *sessionsHandler) handleTitleSuggestion(w http.ResponseWriter, r *http.Request) {
	if h.configStore == nil {
		writeJSON(w, http.StatusOK, titleSuggestionResponse{})
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 4*time.Second)
	defer cancel()
	suggestion := streamtitle.Suggest(ctx, h.configStore.Snapshot(), streamtitle.Options{
		YouTubeAccessToken: streamtitle.YouTubeAccessToken(ctx, h.configStore),
	})
	writeJSON(w, http.StatusOK, titleSuggestionResponse{Title: suggestion.Title, Platform: suggestion.Platform})
}

func parseSessionListLimit(raw string) (int, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0, nil
	}
	limit, err := parsePositiveInt(raw)
	if err != nil {
		return 0, store.ErrInvalidSessionListLimit
	}
	if limit < 1 || limit > 50 {
		return 0, store.ErrInvalidSessionListLimit
	}
	return limit, nil
}

func parsePositiveInt(raw string) (int, error) {
	var value int
	for _, r := range raw {
		if r < '0' || r > '9' {
			return 0, store.ErrInvalidSessionListLimit
		}
		value = value*10 + int(r-'0')
	}
	return value, nil
}
