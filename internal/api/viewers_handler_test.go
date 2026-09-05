package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
)

func TestViewers_WhenMerge_ExpectSourceHidden(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	fromID := seedViewer(t, env, "twitch", "1", "A")
	intoID := seedViewer(t, env, "youtube", "2", "B")

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/viewers/merge", strings.NewReader(`{"from_id":"`+fromID+`","into_id":"`+intoID+`"}`))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	listRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(listRec, httptest.NewRequest(http.MethodGet, "/api/viewers", nil))
	require.Equal(t, http.StatusOK, listRec.Code)

	var listPayload struct {
		Viewers []struct {
			ID string `json:"id"`
		} `json:"viewers"`
	}
	require.NoError(t, json.Unmarshal(listRec.Body.Bytes(), &listPayload))
	require.Len(t, listPayload.Viewers, 1)
	require.Equal(t, intoID, listPayload.Viewers[0].ID)

	getRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(getRec, httptest.NewRequest(http.MethodGet, "/api/viewers/get?id="+fromID, nil))
	require.Equal(t, http.StatusNotFound, getRec.Code)
}

func TestViewers_WhenSelfMerge_ExpectBadRequest(t *testing.T) {
	handler := testHandler(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/viewers/merge", strings.NewReader(`{"from_id":"same","into_id":"same"}`))
	req.Header.Set("Content-Type", "application/json")
	handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestViewers_WhenStartSession_ExpectSessionCountersReset(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	id := seedViewer(t, env, "twitch", "42", "Alice")

	beforeRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(beforeRec, httptest.NewRequest(http.MethodGet, "/api/viewers/get?id="+id, nil))
	require.Equal(t, http.StatusOK, beforeRec.Code)

	var before struct {
		SessionMessageCount int `json:"session_message_count"`
		SessionXP           int `json:"session_xp"`
		MessageCount        int `json:"message_count"`
		XP                  int `json:"xp"`
	}
	require.NoError(t, json.Unmarshal(beforeRec.Body.Bytes(), &before))
	require.Equal(t, 1, before.SessionMessageCount)
	require.Equal(t, 1, before.SessionXP)

	startRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(startRec, httptest.NewRequest(http.MethodPost, "/api/sessions/start", nil))
	require.Equal(t, http.StatusOK, startRec.Code)

	afterRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(afterRec, httptest.NewRequest(http.MethodGet, "/api/viewers/get?id="+id, nil))
	require.Equal(t, http.StatusOK, afterRec.Code)

	var after struct {
		SessionMessageCount int `json:"session_message_count"`
		SessionXP           int `json:"session_xp"`
		MessageCount        int `json:"message_count"`
		XP                  int `json:"xp"`
	}
	require.NoError(t, json.Unmarshal(afterRec.Body.Bytes(), &after))
	require.Equal(t, 0, after.SessionMessageCount)
	require.Equal(t, 0, after.SessionXP)
	require.Equal(t, before.MessageCount, after.MessageCount)
	require.Equal(t, before.XP, after.XP)
}

func TestLeaderboard_WhenInvalidPeriod_ExpectSession(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	seedViewer(t, env, "twitch", "42", "Alice")

	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/leaderboard?period=week", nil))
	require.Equal(t, http.StatusOK, rec.Code)

	var payload struct {
		Period string `json:"period"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Equal(t, "session", payload.Period)
}

func TestViewerIngest_WhenTwoMessages_ExpectStoreIncrementAndLeaderboardFrame(t *testing.T) {
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
		ID:       "1",
		Platform: "twitch",
		UserID:   "42",
		Username: "alice",
		Message:  "one",
	})))
	require.NoError(t, b.Publish(bus.ChatMessageReceived(bus.ChatMessage{
		ID:       "2",
		Platform: "twitch",
		UserID:   "42",
		Username: "alice",
		Message:  "two",
	})))

	require.Eventually(t, func() bool {
		listRec := httptest.NewRecorder()
		env.Handler.ServeHTTP(listRec, httptest.NewRequest(http.MethodGet, "/api/viewers", nil))
		return listRec.Code == http.StatusOK && strings.Contains(listRec.Body.String(), `"message_count":2`)
	}, 2*time.Second, 25*time.Millisecond)

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
		if frame["type"] == "leaderboard" && frame["period"] == "session" {
			return
		}
	}

	t.Fatal("expected leaderboard frame with period=session")
}

func TestViewers_WhenList_ExpectPlatformsWithoutIdentities(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	twitchID := seedViewer(t, env, "twitch", "1", "Alice")
	youtubeID := seedViewer(t, env, "youtube", "2", "Bob")

	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/viewers", nil))
	require.Equal(t, http.StatusOK, rec.Code)

	body := rec.Body.String()
	require.Contains(t, body, `"platforms":`)
	require.NotContains(t, body, `"identities"`)

	var payload struct {
		Viewers []struct {
			ID        string   `json:"id"`
			Platforms []string `json:"platforms"`
		} `json:"viewers"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Len(t, payload.Viewers, 2)

	byID := make(map[string][]string, len(payload.Viewers))
	for _, viewer := range payload.Viewers {
		require.NotNil(t, viewer.Platforms)
		byID[viewer.ID] = viewer.Platforms
	}

	require.Equal(t, []string{"twitch"}, byID[twitchID])
	require.Equal(t, []string{"youtube"}, byID[youtubeID])
}

func TestViewers_WhenGet_ExpectIdentities(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	id := seedViewer(t, env, "twitch", "42", "Alice")

	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/viewers/get?id="+id, nil))
	require.Equal(t, http.StatusOK, rec.Code)

	var payload struct {
		Platforms  []string `json:"platforms"`
		Identities []struct {
			Platform string `json:"platform"`
			UserID   string `json:"user_id"`
		} `json:"identities"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.NotEmpty(t, payload.Identities)
	require.Equal(t, "twitch", payload.Identities[0].Platform)
	require.Equal(t, "42", payload.Identities[0].UserID)
	require.NotNil(t, payload.Platforms)
}

func TestViewerIngest_WhenEmptyUserID_ExpectNoViewer(t *testing.T) {
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
		ID:       "ghost",
		Platform: "twitch",
		UserID:   "",
		Username: "ghost",
		Message:  "hello",
	})))

	time.Sleep(leaderboardDebounce + 50*time.Millisecond)

	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/viewers", nil))
	require.Equal(t, http.StatusOK, rec.Code)

	var payload struct {
		Viewers []any `json:"viewers"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Empty(t, payload.Viewers)

	_ = conn.SetReadDeadline(time.Now().Add(100 * time.Millisecond))
	for {
		_, data, readErr := conn.ReadMessage()
		if readErr != nil {
			break
		}
		var frame map[string]any
		require.NoError(t, json.Unmarshal(data, &frame))
		require.NotEqual(t, "leaderboard", frame["type"])
	}
}

func TestLeaderboard_WhenLimitQuery_ExpectCap(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	for i := range 6 {
		id := seedViewer(t, env, "twitch", fmt.Sprintf("user-%d", i), "Viewer")
		require.NotEmpty(t, id)
	}

	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/leaderboard?period=all&limit=2", nil))
	require.Equal(t, http.StatusOK, rec.Code)

	var payload struct {
		Entries []struct {
			Rank int `json:"rank"`
		} `json:"entries"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Len(t, payload.Entries, 2)
	require.Equal(t, 1, payload.Entries[0].Rank)
	require.Equal(t, 2, payload.Entries[1].Rank)
}

func TestViewers_WhenLeaderboardHidden_ExpectOmittedFromLeaderboardStillListed(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	id := seedViewer(t, env, "twitch", "42", "Alice")

	updateRec := httptest.NewRecorder()
	updateReq := httptest.NewRequest(http.MethodPost, "/api/viewers/update", strings.NewReader(`{"id":"`+id+`","leaderboard_hidden":true}`))
	updateReq.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(updateRec, updateReq)
	require.Equal(t, http.StatusOK, updateRec.Code)

	listRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(listRec, httptest.NewRequest(http.MethodGet, "/api/viewers", nil))
	require.Equal(t, http.StatusOK, listRec.Code)
	require.Contains(t, listRec.Body.String(), id)

	getRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(getRec, httptest.NewRequest(http.MethodGet, "/api/viewers/get?id="+id, nil))
	require.Equal(t, http.StatusOK, getRec.Code)
	require.Contains(t, getRec.Body.String(), `"leaderboard_hidden":true`)

	leaderboardRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(leaderboardRec, httptest.NewRequest(http.MethodGet, "/api/leaderboard?period=all", nil))
	require.Equal(t, http.StatusOK, leaderboardRec.Code)

	var leaderboard struct {
		Entries []struct {
			DisplayName string `json:"display_name"`
		} `json:"entries"`
	}
	require.NoError(t, json.Unmarshal(leaderboardRec.Body.Bytes(), &leaderboard))
	for _, entry := range leaderboard.Entries {
		require.NotEqual(t, "Alice", entry.DisplayName)
	}
}
