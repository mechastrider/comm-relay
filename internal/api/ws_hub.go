package api

import (
	"context"
	"sync"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/command"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/store"
)

// ClientSendBuffer is the per-client outbound queue capacity before messages are dropped.
const ClientSendBuffer = 64

// Hub broadcasts chat events to connected WebSocket clients.
type Hub struct {
	mu          sync.Mutex
	clients     map[*wsClient]struct{}
	bus         *bus.Bus
	matcher     *command.Matcher
	cfgStore    *config.Store
	viewerStore *store.Store
}

// NewHub creates a WebSocket hub bound to the shared event bus.
func NewHub(b *bus.Bus, matcher *command.Matcher, cfgStore *config.Store, viewerStore *store.Store) (*Hub, error) {
	if b == nil {
		return nil, errors.New("event bus is required")
	}

	return &Hub{
		clients:     make(map[*wsClient]struct{}),
		bus:         b,
		matcher:     matcher,
		cfgStore:    cfgStore,
		viewerStore: viewerStore,
	}, nil
}

// Run consumes bus events and broadcasts them to connected clients until context cancellation.
func (h *Hub) Run(ctx context.Context) {
	events, unsub := h.bus.Subscribe()
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

			h.handleChatMessage(ctx, ev.Message)
		}
	}
}

func (h *Hub) handleChatMessage(ctx context.Context, msg bus.ChatMessage) {
	var matchedCmd *store.Command
	if h.matcher != nil {
		if cmd, ok := h.matcher.Lookup(msg.Message); ok {
			matchedCmd = cmd
		}
	}

	isCommand := matchedCmd != nil
	payload, err := chatMessageWirePayload(msg, isCommand)
	if err != nil {
		clog.Errorf(ctx, "chat wire payload: %w", err)
		return
	}

	h.broadcast(payload)

	if matchedCmd == nil {
		return
	}

	if !h.matcher.TryFire(msg.Platform, msg.UserID, matchedCmd) {
		return
	}

	name := command.DisplayName(msg.Username, msg.DisplayName)
	text := command.SubstituteTemplate(matchedCmd.SplashTemplate, name, 0)
	alertPayload, err := alertWirePayload(matchedCmd, msg, text, 0)
	if err != nil {
		clog.Errorf(ctx, "alert wire payload: %w", err)
		return
	}

	h.broadcast(alertPayload)

	if h.viewerStore != nil {
		event := store.AppendInteractionEventInput{
			Kind:           store.InteractionEventCommand,
			CommandTrigger: matchedCmd.Trigger,
			Points:         0,
		}
		if viewerID, ok := h.viewerStore.ViewerIDForIdentity(msg.Platform, msg.UserID); ok {
			event.ViewerID = viewerID
		}
		if err := h.viewerStore.AppendInteractionEvent(event); err != nil {
			clog.Errorf(ctx, "append command interaction event: %w", err)
		}
	}
}

func (h *Hub) register(c *wsClient) {
	h.mu.Lock()
	h.clients[c] = struct{}{}
	h.mu.Unlock()
}

func (h *Hub) unregister(c *wsClient) {
	h.mu.Lock()
	if _, ok := h.clients[c]; ok {
		delete(h.clients, c)
		close(c.send)
	}
	h.mu.Unlock()
}

// ClientCount returns the number of connected WebSocket clients.
func (h *Hub) ClientCount() int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.clients)
}

func (h *Hub) broadcast(payload []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()

	for c := range h.clients {
		select {
		case c.send <- payload:
		default:
			// Slow client: drop this frame without blocking other clients.
		}
	}
}

// Broadcast sends a JSON payload to all connected WebSocket clients.
func (h *Hub) Broadcast(payload []byte) {
	h.broadcast(payload)
}
