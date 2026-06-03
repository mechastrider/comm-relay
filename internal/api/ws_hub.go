package api

import (
	"context"
	"sync"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/muonsoft/clog"
)

// ClientSendBuffer is the per-client outbound queue capacity before messages are dropped.
const ClientSendBuffer = 64

// Hub broadcasts chat events to connected WebSocket clients.
type Hub struct {
	mu      sync.Mutex
	clients map[*wsClient]struct{}
	bus     *bus.Bus
	stop    chan struct{}
}

func newHub(b *bus.Bus) *Hub {
	return &Hub{
		clients: make(map[*wsClient]struct{}),
		bus:     b,
		stop:    make(chan struct{}),
	}
}

func (h *Hub) Run() {
	events, unsub := h.bus.Subscribe()
	defer unsub()

	for {
		select {
		case <-h.stop:
			return
		case ev, ok := <-events:
			if !ok {
				return
			}
			if ev.Type != bus.EventChatMessageReceived {
				continue
			}

			payload, err := chatMessageWirePayload(ev.Message)
			if err != nil {
				clog.Errorf(context.Background(), "chat wire payload: %w", err)
				continue
			}

			h.broadcast(payload)
		}
	}
}

func (h *Hub) Stop() {
	select {
	case <-h.stop:
	default:
		close(h.stop)
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

func (h *Hub) clientCount() int {
	h.mu.Lock()
	defer h.mu.Unlock()

	return len(h.clients)
}
