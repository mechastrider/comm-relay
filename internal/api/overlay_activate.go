package api

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
)

type overlayActivateRequest struct {
	PresetID string `json:"preset_id"`
}

func (h *configHandler) handleOverlayActivate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		clog.Errorf(ctx, "read overlay activate body: %w", err)
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var req overlayActivateRequest
	if err := json.Unmarshal(body, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	if err := h.store.ActivatePreset(req.PresetID); err != nil {
		if errors.Is(err, config.ErrBlankPresetID) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, config.ErrUnknownPresetID) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		clog.Errorf(ctx, "activate overlay preset: %w", err)
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

	writeJSON(w, http.StatusOK, saved.Public())
}
