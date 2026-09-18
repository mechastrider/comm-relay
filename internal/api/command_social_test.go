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
	"github.com/mechastrider/comm-relay/internal/store"
)

func TestCommandSocial_WhenGGExtraWords_ExpectOrdinaryChat(t *testing.T) {
	b := bus.New(0)
	env := newTestEnv(t, b)

	require.NoError(t, b.Publish(bus.ChatMessageReceived(bus.ChatMessage{
		ID: "gg-extra", Platform: "twitch", UserID: "1", Username: "alice", Message: "!gg alice",
	})))

	require.Eventually(t, func() bool {
		rec := httptest.NewRecorder()
		env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/messages/recent?limit=10", nil))
		if rec.Code != http.StatusOK {
			return false
		}
		var payload struct {
			Messages []struct {
				ID             string `json:"id"`
				IsCommand      bool   `json:"is_command"`
				CommandOutcome *struct {
					Status string `json:"status"`
				} `json:"command_outcome"`
			} `json:"messages"`
		}
		if json.Unmarshal(rec.Body.Bytes(), &payload) != nil {
			return false
		}
		for _, msg := range payload.Messages {
			if msg.ID == "gg-extra" {
				return !msg.IsCommand && msg.CommandOutcome == nil
			}
		}
		return false
	}, 2*time.Second, 25*time.Millisecond)
}

func TestCommandSocial_WhenLikeMissingArg_ExpectRejectedCommand(t *testing.T) {
	b := bus.New(0)
	env := newTestEnv(t, b)
	srv := httptest.NewServer(env.Handler)
	t.Cleanup(srv.Close)

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })
	time.Sleep(50 * time.Millisecond)

	seedViewer(t, env, "twitch", "alice", "Alice")

	require.NoError(t, b.Publish(bus.ChatMessageReceived(bus.ChatMessage{
		ID: "like-missing", Platform: "twitch", UserID: "alice", Username: "alice", Message: "!like",
	})))

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
		if frame["type"] == "command_outcome" && frame["message_id"] == "like-missing" {
			require.Equal(t, "rejected", frame["status"])
			require.Equal(t, "missing_arg", frame["reason"])
			require.Equal(t, "like", frame["trigger"])
			return
		}
		if frame["type"] == "message" && frame["id"] == "like-missing" {
			require.Equal(t, true, frame["is_command"])
		}
	}
	t.Fatal("expected rejected like outcome")
}

func TestCommandSocial_WhenLikeTypoTrigger_ExpectCanonicalTrigger(t *testing.T) {
	b := bus.New(0)
	env := newTestEnv(t, b)
	srv := httptest.NewServer(env.Handler)
	t.Cleanup(srv.Close)

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })
	time.Sleep(50 * time.Millisecond)

	seedViewer(t, env, "twitch", "alice", "Alice")
	seedViewer(t, env, "twitch", "bob", "Bob")

	require.NoError(t, b.Publish(bus.ChatMessageReceived(bus.ChatMessage{
		ID: "lik-typo", Platform: "twitch", UserID: "alice", Username: "alice", Message: "!lik bob",
	})))

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
		if frame["type"] == "command_outcome" && frame["message_id"] == "lik-typo" {
			require.Equal(t, "like", frame["trigger"])
			return
		}
	}
	t.Fatal("expected command_outcome with canonical like trigger")
}

func TestCommandSocial_WhenCooldown_ExpectQuotaUnchanged(t *testing.T) {
	b := bus.New(0)
	env := newTestEnv(t, b)
	aliceID := seedViewer(t, env, "twitch", "alice", "Alice")
	seedViewer(t, env, "twitch", "bob", "Bob")

	like, err := env.ViewerStore.GetCommand("like")
	require.NoError(t, err)
	updated, err := env.ViewerStore.UpdateCommand(store.UpdateCommandInput{
		ID: like.ID, Trigger: like.Trigger, Enabled: true, Action: store.CommandActionLike,
		AwardID: like.AwardID, CooldownSeconds: 300,
	})
	require.NoError(t, err)
	require.Equal(t, 300, updated.CooldownSeconds)

	publish := func(id string) {
		require.NoError(t, b.Publish(bus.ChatMessageReceived(bus.ChatMessage{
			ID: id, Platform: "twitch", UserID: "alice", Username: "alice", Message: "!like bob",
		})))
	}
	publish("like-1")
	publish("like-2")

	require.Eventually(t, func() bool {
		uses, metricErr := env.ViewerStore.ProgressionMetricValue(aliceID, store.ProgressionMetricCommandCount, like.ID)
		return metricErr == nil && uses == 1
	}, 2*time.Second, 25*time.Millisecond)
}
