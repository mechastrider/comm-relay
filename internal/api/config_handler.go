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
}

func newConfigHandler(store *config.Store) *configHandler {
	return &configHandler{store: store}
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

	writeJSON(w, http.StatusOK, h.store.Snapshot().Public())
}
