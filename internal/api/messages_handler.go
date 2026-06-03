package api

import (
	"net/http"
	"strconv"
)

type messagesHandler struct {
	history *MessageHistory
}

func newMessagesHandler(history *MessageHistory) *messagesHandler {
	return &messagesHandler{history: history}
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
