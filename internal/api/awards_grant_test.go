package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/store"
)

func TestAwardGrant_WhenJokeToExistingViewer_ExpectXPAndAlert(t *testing.T) {
	b := bus.New(0)
	env := newTestEnv(t, b)
	srv := httptest.NewServer(env.Handler)
	t.Cleanup(srv.Close)

	seedViewer(t, env, "twitch", "42", "Alice")

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })

	time.Sleep(50 * time.Millisecond)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/awards/grant", strings.NewReader(`{
		"platform":"twitch",
		"user_id":"42",
		"award_id":"joke"
	}`))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	var grantPayload struct {
		ViewerID string `json:"viewer_id"`
		Points   int    `json:"points"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &grantPayload))
	require.NotEmpty(t, grantPayload.ViewerID)
	require.Equal(t, 10, grantPayload.Points)

	getRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(getRec, httptest.NewRequest(http.MethodGet, "/api/viewers/get?id="+grantPayload.ViewerID, nil))
	require.Equal(t, http.StatusOK, getRec.Code)

	var viewer struct {
		MessageCount int `json:"message_count"`
		XP           int `json:"xp"`
		SessionXP    int `json:"session_xp"`
		DayXP        int `json:"day_xp"`
	}
	require.NoError(t, json.Unmarshal(getRec.Body.Bytes(), &viewer))
	require.Equal(t, 1, viewer.MessageCount)
	require.Equal(t, 11, viewer.XP)
	require.Equal(t, 11, viewer.SessionXP)
	require.Equal(t, 11, viewer.DayXP)

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
		if frame["type"] != "alert" {
			continue
		}
		sawAlert = true
		require.Equal(t, "award", frame["source"])
		require.Equal(t, "joke", frame["award_id"])
		require.Equal(t, "Joke", frame["award_name"])
		require.Equal(t, float64(10), frame["points"])
		require.NotEmpty(t, frame["created_at"])
		require.Contains(t, frame["text"], "Alice")
		require.Contains(t, frame["text"], "10")
		break
	}
	require.True(t, sawAlert, "expected award alert frame")
}

func TestAwardGrant_WhenTemplateHasMessage_ExpectResolvedQuote(t *testing.T) {
	b := bus.New(0)
	env := newTestEnv(t, b)
	srv := httptest.NewServer(env.Handler)
	t.Cleanup(srv.Close)

	seedViewer(t, env, "twitch", "42", "Bob")

	_, err := env.ViewerStore.UpdateAward(store.UpdateAwardInput{
		ID:             "advice",
		Name:           "Advice",
		Points:         50,
		SplashTemplate: "Advice for {viewer}: {message} +{points}",
		Sound:          "chime",
		DurationMs:     5000,
	})
	require.NoError(t, err)

	conn, _, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(srv.URL, "http")+"/ws", nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })
	time.Sleep(50 * time.Millisecond)

	body, err := json.Marshal(map[string]string{
		"platform":     "twitch",
		"user_id":      "42",
		"award_id":     "advice",
		"message_text": "nice catch",
	})
	require.NoError(t, err)
	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/awards/grant", strings.NewReader(string(body))))
	require.Equal(t, http.StatusOK, rec.Code)

	var alert map[string]any
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		_ = conn.SetReadDeadline(time.Now().Add(300 * time.Millisecond))
		_, data, readErr := conn.ReadMessage()
		if readErr != nil || json.Unmarshal(data, &alert) != nil || alert["type"] != "alert" {
			continue
		}
		break
	}
	require.Equal(t, "Advice for Bob: nice catch +50", alert["text"])
}

func TestAwardGrant_WhenMessageTextExceedsCodePointLimit_ExpectTransientBoundedQuote(t *testing.T) {
	b := bus.New(0)
	env := newTestEnv(t, b)
	srv := httptest.NewServer(env.Handler)
	t.Cleanup(srv.Close)
	seedViewer(t, env, "twitch", "42", "Alice")

	conn, _, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(srv.URL, "http")+"/ws", nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })
	time.Sleep(50 * time.Millisecond)

	quote := "  " + strings.Repeat("😀", 281) + "  "
	body, err := json.Marshal(map[string]string{
		"platform":     "twitch",
		"user_id":      "42",
		"award_id":     "joke",
		"message_id":   "msg-42",
		"message_text": quote,
	})
	require.NoError(t, err)
	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/awards/grant", strings.NewReader(string(body))))
	require.Equal(t, http.StatusOK, rec.Code)

	var alert map[string]any
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		_ = conn.SetReadDeadline(time.Now().Add(300 * time.Millisecond))
		_, data, readErr := conn.ReadMessage()
		if readErr != nil || json.Unmarshal(data, &alert) != nil || alert["type"] != "alert" {
			continue
		}
		break
	}
	require.Equal(t, "twitch", alert["message_platform"])
	require.Equal(t, "msg-42", alert["message_id"])
	alertQuote, ok := alert["message_text"].(string)
	require.True(t, ok)
	require.Len(t, []rune(alertQuote), 280)

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
	require.Equal(t, "twitch", awardEvent.MessagePlatform)
	require.Equal(t, "msg-42", awardEvent.MessageID)
}

func TestAwardGrant_WhenNoMessageContext_ExpectGrantWithoutHighlightFields(t *testing.T) {
	b := bus.New(0)
	env := newTestEnv(t, b)
	srv := httptest.NewServer(env.Handler)
	t.Cleanup(srv.Close)
	seedViewer(t, env, "twitch", "42", "Alice")

	conn, _, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(srv.URL, "http")+"/ws", nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })
	time.Sleep(50 * time.Millisecond)

	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/awards/grant", strings.NewReader(`{"platform":"twitch","user_id":"42","award_id":"joke"}`)))
	require.Equal(t, http.StatusOK, rec.Code)

	var alert map[string]any
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		_ = conn.SetReadDeadline(time.Now().Add(300 * time.Millisecond))
		_, data, readErr := conn.ReadMessage()
		if readErr != nil || json.Unmarshal(data, &alert) != nil || alert["type"] != "alert" {
			continue
		}
		break
	}
	require.NotContains(t, alert, "message_platform")
	require.NotContains(t, alert, "message_id")
	require.NotContains(t, alert, "message_text")
}

func TestAwardGrant_WhenQuoteIsProvided_ExpectNoDurableOrResponseQuote(t *testing.T) {
	// Arrange
	env := newTestEnv(t, bus.New(0))
	seedViewer(t, env, "twitch", "42", "Alice")
	const quote = "private award quote must not persist"

	// Act
	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(
		http.MethodPost,
		"/api/awards/grant",
		strings.NewReader(`{"platform":"twitch","user_id":"42","award_id":"joke","message_id":"msg-42","message_text":"`+quote+`"}`),
	))

	// Assert: the normal grant DTO is not a quote carrier.
	require.Equal(t, http.StatusOK, rec.Code)
	require.NotContains(t, rec.Body.String(), quote)

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
	persistedEvent, err := json.Marshal(awardEvent)
	require.NoError(t, err)
	require.NotContains(t, string(persistedEvent), quote)

	configBytes, err := os.ReadFile(env.ConfigStore.Path())
	require.NoError(t, err)
	require.NotContains(t, string(configBytes), quote)
	publicConfig, err := json.Marshal(env.ConfigStore.Snapshot().Public())
	require.NoError(t, err)
	require.NotContains(t, string(publicConfig), quote)
}

func TestAwardGrant_WhenRejectedWithQuote_ExpectErrorDTODoesNotEchoQuote(t *testing.T) {
	// Arrange
	env := newTestEnv(t, bus.New(0))
	const quote = "private quote must not reach an error DTO"

	// Act
	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(
		http.MethodPost,
		"/api/awards/grant",
		strings.NewReader(`{"platform":"twitch","user_id":"42","award_id":"missing","message_text":"`+quote+`"}`),
	))

	// Assert
	require.Equal(t, http.StatusBadRequest, rec.Code)
	require.NotContains(t, rec.Body.String(), quote)
	require.NotContains(t, rec.Body.String(), "message_text")
}

func TestAwardGrant_WhenEmptyUserID_ExpectBadRequest(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	seedViewer(t, env, "twitch", "42", "Alice")

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/awards/grant", strings.NewReader(`{
		"platform":"twitch",
		"user_id":"",
		"award_id":"joke"
	}`))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusBadRequest, rec.Code)

	getRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(getRec, httptest.NewRequest(http.MethodGet, "/api/viewers", nil))
	require.Equal(t, http.StatusOK, getRec.Code)
	require.Contains(t, getRec.Body.String(), `"xp":1`)
}

func TestAwardGrant_WhenUnknownAward_ExpectBadRequest(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	seedViewer(t, env, "twitch", "42", "Alice")

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/awards/grant", strings.NewReader(`{
		"platform":"twitch",
		"user_id":"42",
		"award_id":"missing"
	}`))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestAwardGrant_WhenJokeThenAdvice_ExpectTwoAlertsAndCumulativeXP(t *testing.T) {
	b := bus.New(0)
	env := newTestEnv(t, b)
	srv := httptest.NewServer(env.Handler)
	t.Cleanup(srv.Close)

	seedViewer(t, env, "twitch", "42", "Alice")

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })

	time.Sleep(50 * time.Millisecond)

	grant := func(awardID, messageID string) {
		body := `{"platform":"twitch","user_id":"42","award_id":"` + awardID + `"`
		if messageID != "" {
			body += `,"message_id":"` + messageID + `"`
		}
		body += `}`
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/api/awards/grant", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		env.Handler.ServeHTTP(rec, req)
		require.Equal(t, http.StatusOK, rec.Code)
	}

	grant("joke", "msg-1")
	grant("advice", "msg-1")

	alerts := 0
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) && alerts < 2 {
		_ = conn.SetReadDeadline(time.Now().Add(300 * time.Millisecond))
		_, data, readErr := conn.ReadMessage()
		if readErr != nil {
			continue
		}
		var frame map[string]any
		if json.Unmarshal(data, &frame) != nil {
			continue
		}
		if frame["type"] == "alert" && frame["source"] == "award" {
			alerts++
		}
	}
	require.Equal(t, 2, alerts)

	listRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(listRec, httptest.NewRequest(http.MethodGet, "/api/viewers", nil))
	require.Equal(t, http.StatusOK, listRec.Code)
	require.Contains(t, listRec.Body.String(), `"xp":61`)
}

func TestAwardGrant_WhenUnknownIdentity_ExpectViewerCreated(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/awards/grant", strings.NewReader(`{
		"platform":"twitch",
		"user_id":"brand-new",
		"award_id":"joke"
	}`))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	listRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(listRec, httptest.NewRequest(http.MethodGet, "/api/viewers", nil))
	require.Equal(t, http.StatusOK, listRec.Code)
	require.Contains(t, listRec.Body.String(), `"user_id":"brand-new"`)
	require.Contains(t, listRec.Body.String(), `"xp":10`)
}

func TestMessagesRecent_WhenPublishedChat_ExpectUserID(t *testing.T) {
	b := bus.New(0)
	env := newTestEnv(t, b)

	require.NoError(t, b.Publish(bus.ChatMessageReceived(bus.ChatMessage{
		ID:          "live-1",
		Platform:    "twitch",
		UserID:      "99",
		Username:    "bob",
		DisplayName: "Bob",
		Message:     "hello",
	})))

	require.Eventually(t, func() bool {
		rec := httptest.NewRecorder()
		env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/messages/recent?limit=5", nil))
		if rec.Code != http.StatusOK {
			return false
		}
		return strings.Contains(rec.Body.String(), `"user_id":"99"`)
	}, 2*time.Second, 25*time.Millisecond)
}

func TestAwardGrant_WhenGranted_ExpectLeaderboardSnapshot(t *testing.T) {
	b := bus.New(0)
	env := newTestEnv(t, b)
	srv := httptest.NewServer(env.Handler)
	t.Cleanup(srv.Close)

	seedViewer(t, env, "twitch", "42", "Alice")

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })

	time.Sleep(50 * time.Millisecond)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/awards/grant", strings.NewReader(`{
		"platform":"twitch",
		"user_id":"42",
		"award_id":"joke"
	}`))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		_ = conn.SetReadDeadline(time.Now().Add(500 * time.Millisecond))
		_, data, readErr := conn.ReadMessage()
		if readErr != nil {
			continue
		}
		var frame map[string]any
		if json.Unmarshal(data, &frame) != nil {
			continue
		}
		if frame["type"] == "leaderboard" {
			entries, ok := frame["entries"].([]any)
			if !ok || len(entries) == 0 {
				continue
			}
			first, ok := entries[0].(map[string]any)
			if !ok {
				continue
			}
			require.Equal(t, float64(11), first["xp"])
			return
		}
	}

	t.Fatal("expected leaderboard frame with updated score")
}
