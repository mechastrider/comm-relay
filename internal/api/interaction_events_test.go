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

func TestCommandFire_WhenBangGG_ExpectInteractionEvent(t *testing.T) {
	b := bus.New(0)
	env := newTestEnv(t, b)
	viewerID := seedViewer(t, env, "twitch", "42", "Alice")

	require.NoError(t, b.Publish(bus.ChatMessageReceived(bus.ChatMessage{
		ID:          "cmd-1",
		Platform:    "twitch",
		UserID:      "42",
		Username:    "alice",
		DisplayName: "Alice",
		Message:     "!gg",
	})))

	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		events, listErr := env.ViewerStore.ListInteractionEventsByViewer(viewerID)
		require.NoError(t, listErr)
		for _, event := range events {
			if event.Kind == store.InteractionEventCommand {
				require.Equal(t, "gg", event.CommandTrigger)
				require.Equal(t, viewerID, event.ViewerID)
				require.Equal(t, 0, event.Points)
				return
			}
		}
		time.Sleep(25 * time.Millisecond)
	}

	t.Fatal("expected one command interaction event")
}

func TestCommandFire_WhenUnseenIdentityBangGG_ExpectEventHasViewerID(t *testing.T) {
	b := bus.New(0)
	env := newTestEnv(t, b)

	cfg := env.ConfigStore.Snapshot()
	cfg.ActivityXP = 0
	cfg.ActivityIntervalSeconds = 0
	cfg.ActivitySessionLimit = 0
	require.NoError(t, env.ConfigStore.Replace(cfg))

	srv := httptest.NewServer(env.Handler)
	t.Cleanup(srv.Close)

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })

	time.Sleep(50 * time.Millisecond)

	require.NoError(t, b.Publish(bus.ChatMessageReceived(bus.ChatMessage{
		ID:          "cmd-new",
		Platform:    "twitch",
		UserID:      "new-user",
		Username:    "newbie",
		DisplayName: "Newbie",
		Message:     "!gg",
	})))

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
		if frame["type"] == "alert" {
			sawAlert = true
			break
		}
	}
	require.True(t, sawAlert, "expected alert frame")

	viewerID, ok := env.ViewerStore.ViewerIDForIdentity("twitch", "new-user")
	require.True(t, ok)
	require.NotEmpty(t, viewerID)

	require.Eventually(t, func() bool {
		events, listErr := env.ViewerStore.ListInteractionEventsByViewer(viewerID)
		if listErr != nil {
			return false
		}
		for _, event := range events {
			if event.Kind == store.InteractionEventCommand &&
				event.ViewerID == viewerID &&
				event.CommandTrigger == "gg" {
				return true
			}
		}
		return false
	}, 2*time.Second, 25*time.Millisecond)

	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/viewers", nil))
	require.Equal(t, http.StatusOK, rec.Code)

	var payload struct {
		Viewers []struct {
			MessageCount int `json:"message_count"`
			XP        int `json:"xp"`
		} `json:"viewers"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Len(t, payload.Viewers, 1)
	require.Equal(t, 1, payload.Viewers[0].MessageCount)
	require.Equal(t, 0, payload.Viewers[0].XP)
}

func TestCommandFire_WhenCooldown_ExpectOneInteractionEvent(t *testing.T) {
	b := bus.New(0)
	env := newTestEnv(t, b)
	seedViewer(t, env, "twitch", "42", "Alice")

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

	require.Eventually(t, func() bool {
		count, countErr := env.ViewerStore.CountInteractionEvents()
		return countErr == nil && count == 1
	}, 2*time.Second, 25*time.Millisecond)
}

func TestAwardGrant_WhenJoke_ExpectInteractionEvent(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	seedViewer(t, env, "twitch", "42", "Alice")

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/awards/grant", strings.NewReader(`{
		"platform":"twitch",
		"user_id":"42",
		"award_id":"joke",
		"message_id":"msg-42"
	}`))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	var grantPayload struct {
		ViewerID string `json:"viewer_id"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &grantPayload))

	events, err := env.ViewerStore.ListInteractionEventsByViewer(grantPayload.ViewerID)
	require.NoError(t, err)
	var awardEvent *store.InteractionEvent
	for i := range events {
		if events[i].Kind == store.InteractionEventAward {
			awardEvent = &events[i]
			break
		}
	}
	require.NotNil(t, awardEvent)
	require.Equal(t, "joke", awardEvent.AwardID)
	require.Equal(t, 10, awardEvent.Points)
	require.Equal(t, "twitch", awardEvent.MessagePlatform)
	require.Equal(t, "msg-42", awardEvent.MessageID)
}
