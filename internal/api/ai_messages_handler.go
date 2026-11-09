package api

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/aimessage"
	"github.com/mechastrider/comm-relay/internal/config"
)

// Serializes config enable and command-name changes so m cannot be reserved concurrently.
var aiConfigurationMu sync.Mutex

type aiMessagesHandler struct{ service *aimessage.Service }

func (h aiMessagesHandler) available(w http.ResponseWriter) bool {
	if h.service == nil {
		writeError(w, 503, "AI messages unavailable")
		return false
	}
	return true
}
func aiError(w http.ResponseWriter, r *http.Request, err error) {
	if fields := config.ValidationFields(err); len(fields) > 0 {
		writeFieldErrors(w, http.StatusBadRequest, "Check the highlighted fields.", fields)
		return
	}
	switch {
	case errors.Is(err, config.ErrInvalidConfig):
		writeError(w, 400, err.Error())
	case errors.Is(err, aimessage.ErrInvalid):
		writeError(w, 400, err.Error())
	case errors.Is(err, aimessage.ErrConflict):
		writeError(w, 409, "AI message changed, expired, or queue is full")
	case errors.Is(err, aimessage.ErrNotFound):
		writeError(w, 404, "AI message not found")
	case errors.Is(err, aimessage.ErrUnavailable):
		writeError(w, 503, "AI messages disabled or paused")
	default:
		if _, ok := errors.As[*aimessage.ProviderError](err); ok {
			writeError(w, 502, err.Error())
			return
		}
		clog.Errorf(r.Context(), "AI message request: %w", err)
		writeError(w, 500, "AI message operation failed")
	}
}
func (h aiMessagesHandler) list(w http.ResponseWriter, r *http.Request) {
	if !h.available(w) {
		return
	}
	limit := 50
	if raw := r.URL.Query().Get("limit"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 1 || n > 100 {
			writeError(w, 400, "invalid limit")
			return
		}
		limit = n
	}
	writeJSON(w, 200, h.service.List(r.Context(), r.URL.Query().Get("state"), r.URL.Query().Get("before_id"), limit))
}
func (h aiMessagesHandler) action(action string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !h.available(w) {
			return
		}
		var body struct {
			JobID            string `json:"job_id"`
			ExpectedRevision int    `json:"expected_revision"`
			Profile          string `json:"profile"`
		}
		d := json.NewDecoder(io.LimitReader(r.Body, 4097))
		d.DisallowUnknownFields()
		if d.Decode(&body) != nil {
			writeError(w, 400, "invalid request")
			return
		}
		var extra any
		if d.Decode(&extra) != io.EOF {
			writeError(w, 400, "invalid request")
			return
		}
		switch action {
		case "resume":
			if err := h.service.Resume(r.Context()); err != nil {
				aiError(w, r, err)
				return
			}
			writeJSON(w, 200, h.service.List(r.Context(), "", "", 1))
		case "clear-history":
			writeJSON(w, 200, map[string]int{"deleted": h.service.ClearHistory(r.Context())})
		case "test":
			result, err := h.service.Test(r.Context(), body.Profile)
			if err != nil {
				aiError(w, r, err)
				return
			}
			writeJSON(w, 200, result)
		default:
			job, err := h.service.Action(r.Context(), body.JobID, body.ExpectedRevision, action)
			if err != nil {
				aiError(w, r, err)
				return
			}
			writeJSON(w, 200, job)
		}
	}
}
func registerAIRoutes(mux *http.ServeMux, service *aimessage.Service) {
	h := aiMessagesHandler{service: service}
	mux.HandleFunc("GET /api/ai-messages", h.list)
	for _, action := range []string{"approve", "reject", "cancel", "resume", "clear-history", "test"} {
		mux.HandleFunc("POST /api/ai-messages/"+action, h.action(action))
	}
}
func aiTriggerConflict(cfg *config.Store, trigger string, aliases []string) bool {
	if cfg == nil || !cfg.Snapshot().Features.ExperimentalAIMessages {
		return false
	}
	for _, name := range append([]string{trigger}, aliases...) {
		if strings.EqualFold(strings.TrimSpace(strings.TrimPrefix(name, "!")), "m") {
			return true
		}
	}
	return false
}
