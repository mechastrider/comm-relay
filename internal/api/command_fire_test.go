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
	"github.com/mechastrider/comm-relay/internal/config"
)

func TestCommandFire_WhenBangGG_ExpectAlertAndIsCommand(t *testing.T) {
	b := bus.New(0)
	env := newTestEnv(t, b)
	srv := httptest.NewServer(env.Handler)
	t.Cleanup(srv.Close)

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })

	time.Sleep(50 * time.Millisecond)

	require.NoError(t, b.Publish(bus.ChatMessageReceived(bus.ChatMessage{
		ID:          "cmd-1",
		Platform:    "twitch",
		UserID:      "42",
		Username:    "alice",
		DisplayName: "Alice",
		Message:     "  !GG  ",
	})))

	var sawMessage bool
	var sawAlert bool
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		_ = conn.SetReadDeadline(time.Now().Add(300 * time.Millisecond))
		_, data, readErr := conn.ReadMessage()
		if readErr != nil {
			continue
		}
		var frame map[string]any
		if json.Unmarshal(data, &frame) != nil {
			continue
		}
		switch frame["type"] {
		case "message":
			sawMessage = true
			require.Equal(t, true, frame["is_command"])
			require.Equal(t, "  !GG  ", frame["message"])
		case "alert":
			sawAlert = true
			require.Equal(t, "command", frame["source"])
			require.Equal(t, "gg", frame["trigger"])
			require.Equal(t, "Alice", frame["name"])
			require.Equal(t, "Good game, Alice!", frame["text"])
			require.Equal(t, float64(0), frame["points"])
			require.Equal(t, "chime", frame["sound"])
		}
		if sawMessage && sawAlert {
			return
		}
	}

	require.True(t, sawMessage, "expected message frame with is_command")
	require.True(t, sawAlert, "expected alert frame")
}

func TestCommandFire_WhenCooldown_ExpectOneAlert(t *testing.T) {
	b := bus.New(0)
	env := newTestEnv(t, b)
	srv := httptest.NewServer(env.Handler)
	t.Cleanup(srv.Close)

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })

	time.Sleep(50 * time.Millisecond)

	alerts := make(chan struct{}, 4)
	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			_, data, readErr := conn.ReadMessage()
			if readErr != nil {
				return
			}
			var frame map[string]any
			if json.Unmarshal(data, &frame) != nil {
				continue
			}
			if frame["type"] == "alert" {
				alerts <- struct{}{}
			}
		}
	}()
	t.Cleanup(func() {
		_ = conn.Close()
		<-done
	})

	publish := func(id string) {
		require.NoError(t, b.Publish(bus.ChatMessageReceived(bus.ChatMessage{
			ID:       id,
			Platform: "twitch",
			UserID:   "42",
			Username: "alice",
			Message:  "!gg",
		})))
	}

	publish("cmd-1")
	publish("cmd-2")

	select {
	case <-alerts:
	case <-time.After(2 * time.Second):
		t.Fatal("expected first alert")
	}

	select {
	case <-alerts:
		t.Fatal("unexpected second alert within cooldown")
	case <-time.After(300 * time.Millisecond):
	}
}

func TestViewerIngest_WhenCommand_ExpectMessageCountWithoutScore(t *testing.T) {
	b := bus.New(0)
	env := newTestEnv(t, b)

	cfg := env.ConfigStore.Snapshot()
	cfg.PointsPerMessage = 5
	require.NoError(t, env.ConfigStore.Replace(cfg))

	seedViewer(t, env, "twitch", "42", "Alice")

	beforeRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(beforeRec, httptest.NewRequest(http.MethodGet, "/api/viewers", nil))
	require.Equal(t, http.StatusOK, beforeRec.Code)

	var before struct {
		Viewers []struct {
			MessageCount int `json:"message_count"`
			Score        int `json:"score"`
		} `json:"viewers"`
	}
	require.NoError(t, json.Unmarshal(beforeRec.Body.Bytes(), &before))
	require.Len(t, before.Viewers, 1)
	require.Equal(t, 1, before.Viewers[0].MessageCount)
	require.Equal(t, 5, before.Viewers[0].Score)

	require.NoError(t, b.Publish(bus.ChatMessageReceived(bus.ChatMessage{
		ID:       "cmd-gg",
		Platform: "twitch",
		UserID:   "42",
		Username: "alice",
		Message:  "!gg",
	})))

	require.Eventually(t, func() bool {
		rec := httptest.NewRecorder()
		env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/viewers", nil))
		if rec.Code != http.StatusOK {
			return false
		}
		var payload struct {
			Viewers []struct {
				MessageCount int `json:"message_count"`
				Score        int `json:"score"`
			} `json:"viewers"`
		}
		if json.Unmarshal(rec.Body.Bytes(), &payload) != nil {
			return false
		}
		return len(payload.Viewers) == 1 &&
			payload.Viewers[0].MessageCount == 2 &&
			payload.Viewers[0].Score == 5
	}, 2*time.Second, 25*time.Millisecond)
}

func TestConfig_WhenHideCommandMessages_ExpectPublicAndOverlaySettings(t *testing.T) {
	b := bus.New(0)
	env := newTestEnv(t, b)

	getRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(getRec, httptest.NewRequest(http.MethodGet, "/api/config", nil))
	require.Equal(t, http.StatusOK, getRec.Code)

	var getPayload map[string]any
	require.NoError(t, json.Unmarshal(getRec.Body.Bytes(), &getPayload))
	require.Equal(t, false, getPayload["hide_command_messages"])

	srv := httptest.NewServer(env.Handler)
	t.Cleanup(srv.Close)

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })

	time.Sleep(50 * time.Millisecond)

	body := strings.NewReader(`{
  "server_port": 17877,
  "hide_command_messages": true,
  "twitch": { "enabled": false, "channel": "" },
  "youtube": { "enabled": false, "oauth": { "client_id": "" } },
  "vk": { "enabled": false },
  "overlay": { "max_messages": 30, "message_ttl_seconds": 20 }
}`)
	patchRec := httptest.NewRecorder()
	patchReq := httptest.NewRequest(http.MethodPost, "/api/config/update", body)
	patchReq.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(patchRec, patchReq)
	require.Equal(t, http.StatusOK, patchRec.Code)

	var patchPayload map[string]any
	require.NoError(t, json.Unmarshal(patchRec.Body.Bytes(), &patchPayload))
	require.Equal(t, true, patchPayload["hide_command_messages"])

	var overlaySettings map[string]any
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		_ = conn.SetReadDeadline(time.Now().Add(300 * time.Millisecond))
		_, data, readErr := conn.ReadMessage()
		if readErr != nil {
			continue
		}
		var frame map[string]any
		if json.Unmarshal(data, &frame) != nil {
			continue
		}
		if frame["type"] == "overlay_settings" {
			overlaySettings = frame
			break
		}
	}
	require.NotNil(t, overlaySettings)
	require.Equal(t, true, overlaySettings["hide_command_messages"])
	require.NotNil(t, overlaySettings["overlay"])
}

func TestConfig_HideCommandMessagesDefault_ExpectFalse(t *testing.T) {
	t.Parallel()

	cfg := config.Default()
	require.False(t, cfg.HideCommandMessages)
	public := cfg.Public()
	require.False(t, public.HideCommandMessages)
}
