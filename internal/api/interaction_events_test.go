package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

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
		if len(events) == 1 {
			require.Equal(t, store.InteractionEventCommand, events[0].Kind)
			require.Equal(t, "gg", events[0].CommandTrigger)
			require.Equal(t, viewerID, events[0].ViewerID)
			require.Equal(t, 0, events[0].Points)
			return
		}
		time.Sleep(25 * time.Millisecond)
	}

	t.Fatal("expected one command interaction event")
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
	require.Len(t, events, 1)
	require.Equal(t, store.InteractionEventAward, events[0].Kind)
	require.Equal(t, "joke", events[0].AwardID)
	require.Equal(t, 10, events[0].Points)
	require.Equal(t, "twitch", events[0].MessagePlatform)
	require.Equal(t, "msg-42", events[0].MessageID)
}
