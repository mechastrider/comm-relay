package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
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

	time.Sleep(50 * time.Millisecond)

	msg := bus.ChatMessage{
		ID:          "prototype-smoke-1",
		Platform:    "twitch",
		Username:    "viewer",
		DisplayName: "Viewer",
		Message:     "prototype smoke",
		Timestamp:   time.Date(2026, 6, 5, 10, 11, 12, 0, time.UTC),
	}

	require.NoError(t, b.Publish(bus.ChatMessageReceived(msg)))

	_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	frame := readWebSocketFrameSkippingLeaderboard(t, conn)
	require.Equal(t, "message", frame["type"])
	require.Equal(t, "twitch", frame["platform"])
	require.Equal(t, "prototype-smoke-1", frame["id"])
	require.Equal(t, "prototype smoke", frame["message"])
	require.Equal(t, "2026-06-05T10:11:12Z", frame["timestamp"])

	var last map[string]any
	require.Eventually(t, func() bool {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/messages/recent?limit=5", nil))
		if rec.Code != http.StatusOK {
			return false
		}

		var recent struct {
			Messages []map[string]any `json:"messages"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &recent); err != nil {
			return false
		}
		if len(recent.Messages) == 0 {
			return false
		}

		last = recent.Messages[len(recent.Messages)-1]
		return last["id"] == "prototype-smoke-1" && last["message"] == "prototype smoke"
	}, 3*time.Second, 25*time.Millisecond)

	require.Equal(t, frame["timestamp"], last["timestamp"])
}
