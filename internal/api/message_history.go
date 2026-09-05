package api

import (
	"context"
	"sync"
	"time"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/store"
)

const defaultRecentMessageCapacity = 100

// MessageHistory keeps the most recent chat messages for admin and OBS dock clients.
type MessageHistory struct {
	mu          sync.RWMutex
	messages    []bus.ChatMessage
	capacity    int
	viewerStore *store.Store
}

// NewMessageHistory creates a bounded in-memory message buffer.
func NewMessageHistory(capacity int) *MessageHistory {
	if capacity <= 0 {
		capacity = defaultRecentMessageCapacity
	}

	return &MessageHistory{
		messages: make([]bus.ChatMessage, 0, capacity),
		capacity: capacity,
	}
}

// SetViewerStore wires the viewer store used to resolve empty chat avatars.
func (h *MessageHistory) SetViewerStore(viewerStore *store.Store) {
	h.viewerStore = viewerStore
}

// Run subscribes to chat events until the context is cancelled.
func (h *MessageHistory) Run(ctx context.Context, b *bus.Bus) {
	events, unsub := b.Subscribe()
	defer unsub()

	for {
		select {
		case <-ctx.Done():
			return
		case ev, ok := <-events:
			if !ok {
				return
			}
			if ev.Type != bus.EventChatMessageReceived {
				continue
			}
			h.append(ev.Message)
		}
	}
}

func (h *MessageHistory) append(msg bus.ChatMessage) {
	msg = fillChatMessageAvatar(h.viewerStore, msg)

	h.mu.Lock()
	defer h.mu.Unlock()

	h.messages = append(h.messages, msg)
	if len(h.messages) > h.capacity {
		h.messages = h.messages[len(h.messages)-h.capacity:]
	}
}

// Delete removes a message identified by its platform and source message ID.
func (h *MessageHistory) Delete(platform, id string) bool {
	if platform == "" || id == "" {
		return false
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	for index, msg := range h.messages {
		if msg.Platform != platform || msg.ID != id {
			continue
		}

		copy(h.messages[index:], h.messages[index+1:])
		h.messages[len(h.messages)-1] = bus.ChatMessage{}
		h.messages = h.messages[:len(h.messages)-1]
		return true
	}

	return false
}

// Recent returns up to limit newest messages in chronological order.
func (h *MessageHistory) Recent(limit int) []adminMessage {
	if limit <= 0 {
		limit = 20
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	start := 0
	if len(h.messages) > limit {
		start = len(h.messages) - limit
	}

	out := make([]adminMessage, 0, len(h.messages)-start)
	for _, msg := range h.messages[start:] {
		out = append(out, adminMessageFromChat(msg))
	}

	return out
}

type adminMessage struct {
	ID          string                `json:"id,omitempty"`
	Platform    string                `json:"platform"`
	UserID      string                `json:"user_id,omitempty"`
	Username    string                `json:"username"`
	DisplayName string                `json:"display_name,omitempty"`
	Message     string                `json:"message"`
	Fragments   []bus.MessageFragment `json:"fragments,omitempty"`
	AvatarURL   string                `json:"avatar_url,omitempty"`
	Timestamp   string                `json:"timestamp"`
	IsCommand   bool                  `json:"is_command,omitempty"`
}

func adminMessageFromChat(msg bus.ChatMessage) adminMessage {
	ts := msg.Timestamp
	if ts.IsZero() {
		ts = time.Now().UTC()
	}

	return adminMessage{
		ID:          msg.ID,
		Platform:    msg.Platform,
		UserID:      msg.UserID,
		Username:    msg.Username,
		DisplayName: msg.DisplayName,
		Message:     msg.Message,
		Fragments:   msg.Fragments,
		AvatarURL:   msg.AvatarURL,
		Timestamp:   ts.UTC().Format(time.RFC3339),
	}
}
