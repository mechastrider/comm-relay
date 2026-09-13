package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/recap"
	"github.com/mechastrider/comm-relay/internal/store"
)

func TestStreamRecaps_Current_WhenNotCaptured_ExpectHiddenWithoutMutation(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	sessionID, err := env.ViewerStore.CurrentSessionID()
	require.NoError(t, err)

	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/stream-recaps/current", nil))
	require.Equal(t, http.StatusOK, rec.Code)

	var payload struct {
		SessionID string          `json:"session_id"`
		Visible   bool            `json:"visible"`
		Snapshot  *recap.Snapshot `json:"snapshot"`
		Session   struct {
			HasRecap bool `json:"has_recap"`
		} `json:"session"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Equal(t, sessionID, payload.SessionID)
	require.False(t, payload.Visible)
	require.Nil(t, payload.Snapshot)
	require.False(t, payload.Session.HasRecap)
}

func TestStreamRecaps_ShowHide_WhenCurrentSession_ExpectVisibleThenHidden(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	sessionID, err := env.ViewerStore.CurrentSessionID()
	require.NoError(t, err)

	showRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(showRec, httptest.NewRequest(http.MethodPost, "/api/stream-recaps/show", strings.NewReader(`{"session_id":"`+sessionID+`"}`)))
	require.Equal(t, http.StatusOK, showRec.Code)
	var showPayload struct {
		Visible  bool            `json:"visible"`
		Snapshot *recap.Snapshot `json:"snapshot"`
	}
	require.NoError(t, json.Unmarshal(showRec.Body.Bytes(), &showPayload))
	require.True(t, showPayload.Visible)
	require.Equal(t, sessionID, showPayload.Snapshot.SessionID)

	hideRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(hideRec, httptest.NewRequest(http.MethodPost, "/api/stream-recaps/hide", strings.NewReader(`{}`)))
	require.Equal(t, http.StatusOK, hideRec.Code)
	var hidePayload struct {
		Visible bool `json:"visible"`
	}
	require.NoError(t, json.Unmarshal(hideRec.Body.Bytes(), &hidePayload))
	require.False(t, hidePayload.Visible)

	currentRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(currentRec, httptest.NewRequest(http.MethodGet, "/api/stream-recaps/current", nil))
	require.Equal(t, http.StatusOK, currentRec.Code)
	var currentPayload struct {
		Visible  bool            `json:"visible"`
		Snapshot *recap.Snapshot `json:"snapshot"`
	}
	require.NoError(t, json.Unmarshal(currentRec.Body.Bytes(), &currentPayload))
	require.False(t, currentPayload.Visible)
	require.Equal(t, sessionID, currentPayload.Snapshot.SessionID)
}

func TestStreamRecaps_Show_WhenAnnouncedAchievementHasEmptyDescription_ExpectSnapshotWithEmptyDescription(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	now := time.Date(2026, 9, 12, 12, 0, 0, 0, time.UTC)
	sessionID, err := env.ViewerStore.CurrentSessionID()
	require.NoError(t, err)

	_, err = env.ViewerStore.CreateAchievement(store.CreateAchievementInput{
		ID:          "empty_desc",
		Name:        "No Description",
		Description: "",
		Enabled:     true,
		Announce:    true,
		Metric:      store.ProgressionMetricMessageCount,
		Target:      1,
		Now:         now,
	})
	require.NoError(t, err)

	identity := store.ChatIdentity{Platform: "twitch", UserID: "viewer", DisplayName: "Viewer"}
	require.NoError(t, env.ViewerStore.ApplyChat(identity, store.ActivitySettings{IntervalSeconds: 0, SessionLimit: 0, XP: 0}, 6, now))
	viewerID, known := env.ViewerStore.ViewerIDForIdentity("twitch", "viewer")
	require.True(t, known)
	_, err = env.ViewerStore.InsertAchievementUnlock(store.InsertAchievementUnlockInput{
		ViewerID:      viewerID,
		SessionID:     sessionID,
		AchievementID: "empty_desc",
		Revision:      1,
		Occurrence:    1,
		ProgressValue: 1,
		Name:          "No Description",
		Description:   "",
		Backfilled:    false,
		UnlockedAt:    now,
	})
	require.NoError(t, err)

	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/stream-recaps/show", strings.NewReader(`{"session_id":"`+sessionID+`"}`)))
	require.Equal(t, http.StatusOK, rec.Code)

	var payload struct {
		Snapshot *recap.Snapshot `json:"snapshot"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.NotNil(t, payload.Snapshot)
	var emptyDescGroup *recap.AchievementGroup
	for i := range payload.Snapshot.AchievementGroups {
		if payload.Snapshot.AchievementGroups[i].AchievementID == "empty_desc" {
			emptyDescGroup = &payload.Snapshot.AchievementGroups[i]
			break
		}
	}
	require.NotNil(t, emptyDescGroup)
	require.Equal(t, "", emptyDescGroup.Description)
}

func TestStreamRecaps_Show_WhenStaleSessionID_ExpectConflict(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	require.NoError(t, env.ViewerStore.StartSession(time.Now()))

	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/stream-recaps/show", strings.NewReader(`{"session_id":"stale-session"}`)))
	require.Equal(t, http.StatusConflict, rec.Code)
}

func TestStreamRecaps_Show_WhenInvalidJSON_ExpectBadRequest(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/stream-recaps/show", strings.NewReader(`{"session_id":`)))
	require.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestStreamRecaps_ShowAgain_WhenLaterActivity_ExpectSameSnapshot(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	sessionID, err := env.ViewerStore.CurrentSessionID()
	require.NoError(t, err)
	now := time.Now().UTC()

	firstRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(firstRec, httptest.NewRequest(http.MethodPost, "/api/stream-recaps/show", strings.NewReader(`{"session_id":"`+sessionID+`"}`)))
	require.Equal(t, http.StatusOK, firstRec.Code)
	firstSnapshot := extractSnapshotJSON(t, firstRec.Body.Bytes())

	require.NoError(t, env.ViewerStore.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "later", DisplayName: "Later",
	}, store.ActivitySettings{IntervalSeconds: 0, SessionLimit: 0, XP: 1}, 6, now))

	secondRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(secondRec, httptest.NewRequest(http.MethodPost, "/api/stream-recaps/show", strings.NewReader(`{"session_id":"`+sessionID+`"}`)))
	require.Equal(t, http.StatusOK, secondRec.Code)
	secondSnapshot := extractSnapshotJSON(t, secondRec.Body.Bytes())
	require.Equal(t, firstSnapshot, secondSnapshot)
}

func TestStreamRecaps_WebSocket_WhenShowAndReconnect_ExpectVisibleState(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	server := httptest.NewServer(env.Handler)
	t.Cleanup(server.Close)

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })

	for range 3 {
		_, _, err = conn.ReadMessage()
		require.NoError(t, err)
	}

	sessionID, err := env.ViewerStore.CurrentSessionID()
	require.NoError(t, err)
	showResp, err := http.Post(server.URL+"/api/stream-recaps/show", "application/json", strings.NewReader(`{"session_id":"`+sessionID+`"}`))
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, showResp.StatusCode)
	_ = showResp.Body.Close()

	_, payload, err := conn.ReadMessage()
	require.NoError(t, err)
	var frame map[string]any
	require.NoError(t, json.Unmarshal(payload, &frame))
	require.Equal(t, wireStreamRecapStateType, frame["type"])
	require.Equal(t, true, frame["visible"])
	require.NotNil(t, frame["snapshot"])

	_ = conn.Close()
	reconnect, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = reconnect.Close() })

	var reconnectFrame map[string]any
	for {
		_, reconnectPayload, readErr := reconnect.ReadMessage()
		require.NoError(t, readErr)
		require.NoError(t, json.Unmarshal(reconnectPayload, &reconnectFrame))
		if reconnectFrame["type"] == wireStreamRecapStateType {
			break
		}
	}
	require.Equal(t, true, reconnectFrame["visible"])
	require.NotNil(t, reconnectFrame["snapshot"])
}

func TestStreamRecaps_WebSocket_WhenDebugClient_ExpectNoRecapFrames(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	server := httptest.NewServer(env.Handler)
	t.Cleanup(server.Close)

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws/overlay-debug"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })

	settings := readWSJSON(t, conn)
	require.Equal(t, "overlay_settings", settings["type"])

	sessionID, err := env.ViewerStore.CurrentSessionID()
	require.NoError(t, err)
	showResp, err := http.Post(server.URL+"/api/stream-recaps/show", "application/json", strings.NewReader(`{"session_id":"`+sessionID+`"}`))
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, showResp.StatusCode)
	_ = showResp.Body.Close()

	requireNoWSFrameWithin(t, conn, 150*time.Millisecond)
}

func TestStreamRecaps_NewStream_WhenRecapVisible_ExpectHidden(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	sessionID, err := env.ViewerStore.CurrentSessionID()
	require.NoError(t, err)

	showRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(showRec, httptest.NewRequest(http.MethodPost, "/api/stream-recaps/show", strings.NewReader(`{"session_id":"`+sessionID+`"}`)))
	require.Equal(t, http.StatusOK, showRec.Code)

	startRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(startRec, httptest.NewRequest(http.MethodPost, "/api/sessions/start", nil))
	require.Equal(t, http.StatusOK, startRec.Code)

	currentRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(currentRec, httptest.NewRequest(http.MethodGet, "/api/stream-recaps/current", nil))
	require.Equal(t, http.StatusOK, currentRec.Code)
	var payload struct {
		Visible bool `json:"visible"`
	}
	require.NoError(t, json.Unmarshal(currentRec.Body.Bytes(), &payload))
	require.False(t, payload.Visible)
}

func TestSessions_ListAndGet_WhenSessionsExist_ExpectBoundedResponses(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	listRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(listRec, httptest.NewRequest(http.MethodGet, "/api/sessions?limit=20", nil))
	require.Equal(t, http.StatusOK, listRec.Code)
	var listPayload struct {
		Sessions []json.RawMessage `json:"sessions"`
	}
	require.NoError(t, json.Unmarshal(listRec.Body.Bytes(), &listPayload))
	require.NotEmpty(t, listPayload.Sessions)

	sessionID, err := env.ViewerStore.CurrentSessionID()
	require.NoError(t, err)
	getRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(getRec, httptest.NewRequest(http.MethodGet, "/api/sessions/get?id="+sessionID, nil))
	require.Equal(t, http.StatusOK, getRec.Code)
	var getPayload struct {
		ID string `json:"id"`
	}
	require.NoError(t, json.Unmarshal(getRec.Body.Bytes(), &getPayload))
	require.Equal(t, sessionID, getPayload.ID)
}

func TestSessions_Get_WhenMissingID_ExpectNotFound(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/sessions/get?id=missing", nil))
	require.Equal(t, http.StatusNotFound, rec.Code)
}

func TestSessions_List_WhenInvalidLimit_ExpectBadRequest(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/sessions?limit=999", nil))
	require.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestStreamRecaps_ControllerRestart_ExpectHidden(t *testing.T) {
	controller := recap.NewController(nil)
	require.False(t, controller.Current().Visible)
	require.Nil(t, controller.Current().Snapshot)
}

func TestStreamRecaps_ShowResponse_WhenSuccessful_ExpectSnakeCaseSnapshot(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	sessionID, err := env.ViewerStore.CurrentSessionID()
	require.NoError(t, err)

	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/stream-recaps/show", bytes.NewBufferString(`{"session_id":"`+sessionID+`"}`)))
	require.Equal(t, http.StatusOK, rec.Code)

	var payload map[string]json.RawMessage
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Contains(t, string(payload["snapshot"]), `"achievement_groups"`)
	require.Contains(t, string(payload["snapshot"]), `"viewer_count"`)
}

func extractSnapshotJSON(t *testing.T, body []byte) string {
	t.Helper()
	var payload struct {
		Snapshot json.RawMessage `json:"snapshot"`
	}
	require.NoError(t, json.Unmarshal(body, &payload))
	return string(payload.Snapshot)
}

func readWSJSON(t *testing.T, conn *websocket.Conn) map[string]any {
	t.Helper()
	var frame map[string]any
	require.NoError(t, conn.ReadJSON(&frame))
	return frame
}

func requireNoWSFrameWithin(t *testing.T, conn *websocket.Conn, wait time.Duration) {
	t.Helper()
	_ = conn.SetReadDeadline(time.Now().Add(wait))
	var frame map[string]any
	err := conn.ReadJSON(&frame)
	require.Error(t, err)
}
