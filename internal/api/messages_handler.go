package api

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/muonsoft/clog"
)

type messagesHandler struct {
	history *MessageHistory
	hub     *Hub
}

func newMessagesHandler(history *MessageHistory, hub *Hub) *messagesHandler {
	return &messagesHandler{history: history, hub: hub}
}

type recentMessagesResponse struct {
	Messages []adminMessage `json:"messages"`
}

func (h *messagesHandler) handleRecent(w http.ResponseWriter, r *http.Request) {
	limit := 20
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			limit = parsed
		}
	}

	writeJSON(w, http.StatusOK, recentMessagesResponse{
		Messages: h.history.Recent(limit),
	})
}

type deleteMessageRequest struct {
	Platform string `json:"platform"`
	ID       string `json:"id"`
}

type deleteMessageResponse struct {
	Deleted bool `json:"deleted"`
}

func (h *messagesHandler) handleDelete(w http.ResponseWriter, r *http.Request) {
	var request deleteMessageRequest
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if request.Platform == "" || request.ID == "" {
		writeError(w, http.StatusBadRequest, "platform and id are required")
		return
	}
	if !h.history.Delete(request.Platform, request.ID) {
		writeError(w, http.StatusNotFound, "message not found")
		return
	}

	payload, err := messageDeletedWirePayload(request.Platform, request.ID)
	if err != nil {
		clog.Errorf(r.Context(), "message deleted wire payload: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to delete message")
		return
	}
	h.hub.broadcast(payload)
	writeJSON(w, http.StatusOK, deleteMessageResponse{Deleted: true})
}
