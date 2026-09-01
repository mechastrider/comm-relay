package api

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
)

type configHandler struct {
	store *config.Store
	hub   *Hub
}

func newConfigHandler(store *config.Store, hub *Hub) *configHandler {
	return &configHandler{store: store, hub: hub}
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
	if err := json.Unmarshal(body, &incoming); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	prev := h.store.Snapshot()
	incoming.MergeYouTubeOAuthFrom(prev)
	incoming.MergeNetworkSOCKS5From(prev)
	incoming.MergeOverlayPresetsFrom(prev, overlayPresetsPresent(body))
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
