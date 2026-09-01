package api

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/muonsoft/clog"

	"github.com/mechastrider/comm-relay/internal/command"
)

type messagesHandler struct {
	history *MessageHistory
	hub     *Hub
	matcher *command.Matcher
}

func newMessagesHandler(history *MessageHistory, hub *Hub) *messagesHandler {
	var matcher *command.Matcher
	if hub != nil {
		matcher = hub.matcher
	}
	return &messagesHandler{history: history, hub: hub, matcher: matcher}
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
		Messages: h.recentMessages(limit),
	})
}

func (h *messagesHandler) recentMessages(limit int) []adminMessage {
	messages := h.history.Recent(limit)
	if h.matcher == nil {
		return messages
	}

	for i := range messages {
		if _, ok := h.matcher.Lookup(messages[i].Message); ok {
			messages[i].IsCommand = true
		}
	}

	return messages
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
