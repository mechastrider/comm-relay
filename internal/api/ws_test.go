package api

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
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
		ID:          "overlay-1",
		Platform:    "twitch",
		Username:    "viewer",
		DisplayName: "Viewer",
		Message:     "Hello overlay",
		Timestamp:   time.Date(2026, 6, 5, 10, 11, 12, 0, time.UTC),
	})))

	_, data, err := conn.ReadMessage()
	require.NoError(t, err)

	var frame map[string]any
	require.NoError(t, json.Unmarshal(data, &frame))
	require.Equal(t, "message", frame["type"])
	require.Equal(t, "twitch", frame["platform"])
	require.Equal(t, "overlay-1", frame["id"])
	require.Equal(t, "Viewer", frame["user"])
	require.Equal(t, "Hello overlay", frame["message"])
	require.Equal(t, "2026-06-05T10:11:12Z", frame["timestamp"])
}

func TestWebSocket_WhenMessageDeleted_ExpectDeletionEvent(t *testing.T) {
	t.Parallel()

	b := bus.New(0)
	handler := testHandlerWithBus(t, b)
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })
	require.NoError(t, conn.SetReadDeadline(time.Now().Add(2*time.Second)))

	require.NoError(t, b.Publish(bus.ChatMessageReceived(bus.ChatMessage{
		ID:       "delete-1",
		Platform: "youtube",
		Username: "viewer",
		Message:  "remove me",
	})))
	_, _, err = conn.ReadMessage()
	require.NoError(t, err)

	require.Eventually(t, func() bool {
		response, requestErr := http.Get(srv.URL + "/api/messages/recent")
		if requestErr != nil {
			return false
		}
		body, readErr := io.ReadAll(response.Body)
		_ = response.Body.Close()
		return readErr == nil && response.StatusCode == http.StatusOK && strings.Contains(string(body), "delete-1")
	}, time.Second, 10*time.Millisecond)

	request, err := http.NewRequest(
		http.MethodPost,
		srv.URL+"/api/messages/delete",
		strings.NewReader(`{"platform":"youtube","id":"delete-1"}`),
	)
	require.NoError(t, err)
	request.Header.Set("Content-Type", "application/json")
	response, err := http.DefaultClient.Do(request)
	require.NoError(t, err)
	t.Cleanup(func() { _ = response.Body.Close() })
	require.Equal(t, http.StatusOK, response.StatusCode)

	_, data, err := conn.ReadMessage()
	require.NoError(t, err)

	var frame map[string]any
	require.NoError(t, json.Unmarshal(data, &frame))
	require.Equal(t, "message_deleted", frame["type"])
	require.Equal(t, "youtube", frame["platform"])
	require.Equal(t, "delete-1", frame["id"])
}
