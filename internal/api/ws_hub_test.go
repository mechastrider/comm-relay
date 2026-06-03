package api

import (
	"testing"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/stretchr/testify/require"
)

func TestHub_broadcast_WhenClientBufferFull_ExpectOtherClientStillReceives(t *testing.T) {
	t.Parallel()

	h, err := NewHub(bus.New(0))
	require.NoError(t, err)

	slow := &wsClient{hub: h, send: make(chan []byte, 1)}
	fast := &wsClient{hub: h, send: make(chan []byte, ClientSendBuffer)}

	slow.send <- []byte("fills-buffer")

	h.mu.Lock()
	h.clients[slow] = struct{}{}
	h.clients[fast] = struct{}{}
	h.mu.Unlock()

	payload := []byte(`{"type":"message","platform":"twitch","user":"a","message":"hi"}`)
	h.broadcast(payload)

	select {
	case got := <-fast.send:
		require.Equal(t, payload, got)
	default:
		t.Fatal("fast client did not receive broadcast")
	}

	require.Equal(t, 1, len(slow.send), "slow client buffer should stay full without accepting broadcast")
}
