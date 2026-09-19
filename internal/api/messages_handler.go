package api

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/muonsoft/clog"

	"github.com/mechastrider/comm-relay/internal/command"
	"github.com/mechastrider/comm-relay/internal/store"
)

type messagesHandler struct {
	history     *MessageHistory
	hub         *Hub
	matcher     *command.Matcher
	viewerStore *store.Store
}

func newMessagesHandler(history *MessageHistory, hub *Hub, viewerStore *store.Store) *messagesHandler {
	var matcher *command.Matcher
	if hub != nil {
		matcher = hub.matcher
	}
	return &messagesHandler{history: history, hub: hub, matcher: matcher, viewerStore: viewerStore}
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
		Messages: h.recentMessages(r.Context(), limit),
	})
}

func (h *messagesHandler) recentMessages(ctx context.Context, limit int) []adminMessage {
	messages := h.history.Recent(limit)
	h.attachGrantedAwardIDs(ctx, messages)
	if h.matcher == nil {
		return messages
	}

	for i := range messages {
		if _, ok := h.matcher.Lookup(messages[i].Message); ok {
			messages[i].IsCommand = true
		}
		if outcome, ok := h.matcher.MessageOutcome(messages[i].Platform, messages[i].ID); ok {
			messages[i].CommandOutcome = &commandOutcomeJSON{
				Trigger:             outcome.Trigger,
				Status:              outcome.Status,
				CooldownRemainingMs: outcome.CooldownRemainingMs,
				Reason:              outcome.Reason,
				ReasonLabel:         outcome.ReasonLabel,
			}
		}
	}

	return messages
}

func (h *messagesHandler) attachGrantedAwardIDs(ctx context.Context, messages []adminMessage) {
	if h.viewerStore == nil || len(messages) == 0 {
		return
	}

	refs := make([]store.MessageRef, 0, len(messages))
	for _, message := range messages {
		if message.Platform == "" || message.ID == "" {
			continue
		}
		refs = append(refs, store.MessageRef{Platform: message.Platform, ID: message.ID})
	}
	if len(refs) == 0 {
		return
	}

	granted, err := h.viewerStore.GrantedAwardIDsForMessages(refs)
	if err != nil {
		clog.Errorf(ctx, "list granted award ids for recent messages: %w", err)
		return
	}
	for i := range messages {
		ids := granted[store.MessageRef{Platform: messages[i].Platform, ID: messages[i].ID}]
		if len(ids) == 0 {
			continue
		}
		messages[i].GrantedAwardIDs = ids
	}
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
