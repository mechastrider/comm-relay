package api

import (
	"net/http"
	"time"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/status"
	"github.com/mechastrider/comm-relay/internal/streamstatus"
)

type streamsStatusHandler struct {
	store       *config.Store
	registry    *status.Registry
	streamStore *streamstatus.Store
}

func newStreamsStatusHandler(store *config.Store, registry *status.Registry, streamStore *streamstatus.Store) *streamsStatusHandler {
	return &streamsStatusHandler{
		store:       store,
		registry:    registry,
		streamStore: streamStore,
	}
}

func (h *streamsStatusHandler) handleGet(w http.ResponseWriter, r *http.Request) {
	cfg := h.store.Snapshot()
	resp := streamstatus.Compose(cfg, h.registry, h.streamStore, time.Now())
	writeJSON(w, http.StatusOK, resp)
}
