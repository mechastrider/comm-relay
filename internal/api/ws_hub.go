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
	mu           sync.Mutex
	clients      map[*wsClient]struct{}
	debugClients map[*wsClient]struct{}
	bus          *bus.Bus
	matcher      *command.Matcher
	cfgStore     *config.Store
	viewerStore  *store.Store
}

// NewHub creates a WebSocket hub bound to the shared event bus.
func NewHub(b *bus.Bus, matcher *command.Matcher, cfgStore *config.Store, viewerStore *store.Store) (*Hub, error) {
	if b == nil {
		return nil, errors.New("event bus is required")
	}

	return &Hub{
		clients:      make(map[*wsClient]struct{}),
		debugClients: make(map[*wsClient]struct{}),
		bus:          b,
		matcher:      matcher,
		cfgStore:     cfgStore,
		viewerStore:  viewerStore,
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
	msg = fillChatMessageAvatar(h.viewerStore, h.cfgStore, msg)

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
}

func (h *Hub) register(c *wsClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if c.debug {
		h.debugClients[c] = struct{}{}
		if h.cfgStore != nil {
			payload, err := overlaySettingsWirePayload(h.cfgStore.Snapshot())
			if err == nil {
				c.send <- payload
			}
		}
		return
	}

	h.clients[c] = struct{}{}
}

func (h *Hub) unregister(c *wsClient) {
	h.mu.Lock()
	clients := h.clients
	if c.debug {
		clients = h.debugClients
	}
	if _, ok := clients[c]; ok {
		delete(clients, c)
		close(c.send)
	}
	h.mu.Unlock()
}

// DebugClientCount returns the number of connected debug WebSocket clients.
func (h *Hub) DebugClientCount() int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.debugClients)
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

	broadcastClients(h.clients, payload)
}

func broadcastClients(clients map[*wsClient]struct{}, payload []byte) {
	for c := range clients {
		select {
		case c.send <- payload:
		default:
			// Slow client: drop this frame without blocking other clients.
		}
	}
}

// BroadcastDebug sends a frame only to the dedicated debug audience and
// returns the number of clients whose bounded queue accepted it.
func (h *Hub) BroadcastDebug(payload []byte) int {
	h.mu.Lock()
	defer h.mu.Unlock()

	accepted := 0
	for c := range h.debugClients {
		select {
		case c.send <- payload:
			accepted++
		default:
			// Slow client: use the same drop policy as the production audience.
		}
	}
	return accepted
}

// BroadcastDebugBatch atomically enqueues a reset and immediate frames for
// the debug audience. Its result counts clients that accepted every frame.
func (h *Hub) BroadcastDebugBatch(payloads ...[]byte) int {
	h.mu.Lock()
	defer h.mu.Unlock()

	accepted := 0
	for c := range h.debugClients {
		acceptedAll := true
		for _, payload := range payloads {
			select {
			case c.send <- payload:
			default:
				acceptedAll = false
			}
			if !acceptedAll {
				break
			}
		}
		if acceptedAll {
			accepted++
		}
	}
	return accepted
}

// Broadcast sends a JSON payload to all connected WebSocket clients.
func (h *Hub) Broadcast(payload []byte) {
	h.broadcast(payload)
}
