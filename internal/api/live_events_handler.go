package api

import (
	"net/http"
	"strconv"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/store"
)

func liveEventsHandler(viewerStore *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if viewerStore == nil {
			writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
			return
		}
		query := store.LiveEventsQuery{Category: r.URL.Query().Get("category"), Cursor: r.URL.Query().Get("cursor")}
		if raw, exists := r.URL.Query()["limit"]; exists {
			limit, err := strconv.Atoi(raw[0])
			if err != nil || limit < 1 || limit > 100 {
				writeError(w, http.StatusBadRequest, "invalid live events request")
				return
			}
			query.Limit = limit
		}
		page, err := viewerStore.ListLiveEvents(r.Context(), query)
		if errors.Is(err, store.ErrInvalidLiveEventsQuery) {
			writeError(w, http.StatusBadRequest, "invalid live events request")
			return
		}
		if err != nil {
			clog.Errorf(r.Context(), "list live events: %w", err)
			writeError(w, http.StatusInternalServerError, "failed to load live events")
			return
		}
		writeJSON(w, http.StatusOK, page)
	}
}
