package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/stretchr/testify/require"
)

// TestPrototypeSmoke_WhenMessagePublished_ExpectWebSocketAndRecentAPI verifies the
// bus -> WebSocket -> overlay wire path used by the Twitch prototype.
func TestPrototypeSmoke_WhenMessagePublished_ExpectWebSocketAndRecentAPI(t *testing.T) {
	t.Parallel()

	b := bus.New(0)
	handler := testHandlerWithBus(t, b)
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })

	msg := bus.ChatMessage{
		Platform:    "twitch",
		Username:    "viewer",
		DisplayName: "Viewer",
		Message:     "prototype smoke",
	}

	var frame map[string]any
	require.Eventually(t, func() bool {
		if err := b.Publish(bus.ChatMessageReceived(msg)); err != nil {
			return false
		}
		_ = conn.SetReadDeadline(time.Now().Add(200 * time.Millisecond))
		_, data, err := conn.ReadMessage()
		if err != nil {
			return false
		}
		frame = nil
		if err := json.Unmarshal(data, &frame); err != nil {
			return false
		}
		return frame["type"] == "message" && frame["message"] == "prototype smoke"
	}, 3*time.Second, 25*time.Millisecond)

	require.Equal(t, "twitch", frame["platform"])

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/messages/recent?limit=5", nil))
	require.Equal(t, http.StatusOK, rec.Code)

	var recent struct {
		Messages []map[string]any `json:"messages"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &recent))
	require.NotEmpty(t, recent.Messages)
	require.Equal(t, "prototype smoke", recent.Messages[len(recent.Messages)-1]["message"])
}
