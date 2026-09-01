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

func TestAwardGrant_WhenJokeToExistingViewer_ExpectScoreAndAlert(t *testing.T) {
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
		Score        int `json:"score"`
		SessionScore int `json:"session_score"`
		DayScore     int `json:"day_score"`
	}
	require.NoError(t, json.Unmarshal(getRec.Body.Bytes(), &viewer))
	require.Equal(t, 1, viewer.MessageCount)
	require.Equal(t, 11, viewer.Score)
	require.Equal(t, 11, viewer.SessionScore)
	require.Equal(t, 11, viewer.DayScore)

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
		require.Equal(t, float64(10), frame["points"])
		require.Contains(t, frame["text"], "Alice")
		require.Contains(t, frame["text"], "10")
		break
	}
	require.True(t, sawAlert, "expected award alert frame")
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
	require.Contains(t, getRec.Body.String(), `"score":1`)
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

func TestAwardGrant_WhenJokeThenAdvice_ExpectTwoAlertsAndCumulativeScore(t *testing.T) {
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
	require.Contains(t, listRec.Body.String(), `"score":61`)
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
	require.Contains(t, listRec.Body.String(), `"score":10`)
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
			require.Equal(t, float64(11), first["score"])
			return
		}
	}

	t.Fatal("expected leaderboard frame with updated score")
}
