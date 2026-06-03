package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/stretchr/testify/require"
)

func TestWebSocket_WhenUpgrade_ExpectSwitchingProtocols(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"
	conn, resp, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	require.Equal(t, http.StatusSwitchingProtocols, resp.StatusCode)
	require.NoError(t, conn.Close())
}

func TestWebSocket_WhenChatPublished_ExpectJSONMessage(t *testing.T) {
	t.Parallel()

	b := bus.New(0)
	handler := testHandlerWithBus(t, b)
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })

	_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))

	require.NoError(t, b.Publish(bus.ChatMessageReceived(bus.ChatMessage{
		Platform:    "twitch",
		Username:    "viewer",
		DisplayName: "Viewer",
		Message:     "Hello overlay",
	})))

	_, data, err := conn.ReadMessage()
	require.NoError(t, err)

	var frame map[string]any
	require.NoError(t, json.Unmarshal(data, &frame))
	require.Equal(t, "message", frame["type"])
	require.Equal(t, "twitch", frame["platform"])
	require.Equal(t, "Viewer", frame["user"])
	require.Equal(t, "Hello overlay", frame["message"])
}

func testHandler(t *testing.T) http.Handler {
	t.Helper()
	return testHandlerWithBus(t, bus.New(0))
}

func testHandlerWithBus(t *testing.T, b *bus.Bus) http.Handler {
	t.Helper()

	hub, err := NewHub(b)
	require.NoError(t, err)

	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	go hub.Run(ctx)

	webRoot := filepath.Join("..", "..", "web")
	handler, err := NewHandler(Options{WebRoot: webRoot, Hub: hub})
	require.NoError(t, err)

	return handler
}
