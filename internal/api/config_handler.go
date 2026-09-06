package api

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/leaderboard"
)

type configHandler struct {
	store                 *config.Store
	hub                   *Hub
	leaderboardPublisher  *LeaderboardPublisher
	leaderboardVisibility *leaderboard.Controller
}

func newConfigHandler(store *config.Store, hub *Hub, leaderboardPublisher *LeaderboardPublisher) *configHandler {
	return &configHandler{
		store:                store,
		hub:                  hub,
		leaderboardPublisher: leaderboardPublisher,
	}
}

func (h *configHandler) handleGet(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, h.store.Snapshot().Public())
}

func (h *configHandler) handleUpdate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		clog.Errorf(ctx, "read config body: %w", err)
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var incoming config.Config
	if fields := config.ValidateIncomingJSONFields(body); len(fields) > 0 {
		writeFieldErrors(w, http.StatusBadRequest, "Check the highlighted fields.", fields)
		return
	}
	if err := json.Unmarshal(body, &incoming); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	prev := h.store.Snapshot()
	incoming.MergeYouTubeOAuthFrom(prev)
	incoming.MergeNetworkSOCKS5From(prev)
	incoming.MergeOverlayPresetsFrom(prev, overlayPresetsPresent(body))
	if !leaderboardVisibilityPresent(body) {
		incoming.LeaderboardVisibility = prev.LeaderboardVisibility
	}
	if !loggingPresent(body) {
		incoming.Logging = prev.Logging
	}
	incoming.ApplyDefaults()

	if err := h.store.Replace(incoming); err != nil {
		if fields := config.ValidationFields(err); len(fields) > 0 {
			writeFieldErrors(w, http.StatusBadRequest, "Check the highlighted fields.", fields)
			return
		}
		if errors.Is(err, config.ErrInvalidConfig) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		clog.Errorf(ctx, "replace config: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to save settings")
		return
	}

	saved := h.store.Snapshot()
	if h.hub != nil {
		payload, err := overlaySettingsWirePayload(saved)
		if err != nil {
			clog.Errorf(ctx, "overlay settings wire payload: %w", err)
		} else {
			h.hub.broadcast(payload)
			h.hub.BroadcastDebug(payload)
		}
	}
	if h.leaderboardPublisher != nil {
		h.leaderboardPublisher.FlushNow()
	}
	if h.leaderboardVisibility != nil {
		if _, err := h.leaderboardVisibility.PolicyChanged(ctx); err != nil {
			clog.Errorf(ctx, "apply leaderboard visibility settings: %w", err)
		}
	}

	writeJSON(w, http.StatusOK, saved.Public())
}

func overlayPresetsPresent(data []byte) bool {
	var doc struct {
		Overlay *struct {
			Presets *json.RawMessage `json:"presets"`
		} `json:"overlay"`
	}
	if err := json.Unmarshal(data, &doc); err != nil {
		return false
	}
	return doc.Overlay != nil && doc.Overlay.Presets != nil
}

func leaderboardVisibilityPresent(data []byte) bool {
	var doc struct {
		LeaderboardVisibility *json.RawMessage `json:"leaderboard_visibility"`
	}
	if err := json.Unmarshal(data, &doc); err != nil {
		return false
	}
	return doc.LeaderboardVisibility != nil
}

func loggingPresent(data []byte) bool {
	var doc struct {
		Logging *json.RawMessage `json:"logging"`
	}
	if err := json.Unmarshal(data, &doc); err != nil {
		return false
	}
	return doc.Logging != nil
}
