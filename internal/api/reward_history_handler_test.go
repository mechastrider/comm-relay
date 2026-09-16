package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/observability"
	"github.com/mechastrider/comm-relay/internal/store"
)

func TestRewardHistory_WhenAwardSnapshotAndSourceExist_ExpectSafePublicFields(t *testing.T) {
	// Arrange
	env := newTestEnv(t, bus.New(0))
	now := time.Date(2026, 9, 2, 12, 0, 0, 0, time.UTC)
	result, err := env.ViewerStore.GrantAward(store.GrantAwardInput{
		Identity:        store.ChatIdentity{Platform: "twitch", UserID: "42", DisplayName: "Alice"},
		Points:          10,
		DayResetHour:    env.ConfigStore.Snapshot().DayResetHour,
		Now:             now,
		AwardID:         "joke",
		AwardName:       "Joke at grant time",
		MessagePlatform: "twitch",
		MessageID:       "private-source-id",
	})
	require.NoError(t, err)
	_, err = env.ViewerStore.UpdateAward(store.UpdateAwardInput{
		ID:             "joke",
		Name:           "Renamed Joke",
		Points:         10,
		SplashTemplate: "Joke for {viewer}",
		Sound:          "soft",
		DurationMs:     5000,
	})
	require.NoError(t, err)
	require.NoError(t, env.ViewerStore.DeleteAward("joke"))

	// Act
	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/reward-history?viewer_id="+result.ViewerID+"&limit=1", nil))

	// Assert
	require.Equal(t, http.StatusOK, rec.Code)
	var payload map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	entries, ok := payload["entries"].([]any)
	require.True(t, ok)
	require.Len(t, entries, 1)
	entry, ok := entries[0].(map[string]any)
	require.True(t, ok)
	assert.Equal(t, map[string]bool{
		"id": true, "kind": true, "viewer_id": true, "viewer_display_name": true,
		"reward_id": true, "reward_name": true, "points": true, "created_at": true,
	}, mapKeys(entry))
	assert.Equal(t, "award", entry["kind"])
	assert.Equal(t, result.ViewerID, entry["viewer_id"])
	assert.Equal(t, "Alice", entry["viewer_display_name"])
	assert.Equal(t, "joke", entry["reward_id"])
	assert.Equal(t, "Joke at grant time", entry["reward_name"])
	assert.NotContains(t, rec.Body.String(), "private-source-id")
	assert.NotContains(t, rec.Body.String(), "twitch")
}

func TestRewardHistory_WhenInvalidRequestOrHiddenViewer_ExpectClientErrors(t *testing.T) {
	// Arrange
	env := newTestEnv(t, bus.New(0))
	now := time.Date(2026, 9, 2, 12, 0, 0, 0, time.UTC)
	from, err := env.ViewerStore.GrantAward(store.GrantAwardInput{
		Identity:     store.ChatIdentity{Platform: "twitch", UserID: "from"},
		Points:       10,
		DayResetHour: env.ConfigStore.Snapshot().DayResetHour,
		Now:          now,
		AwardID:      "joke",
		AwardName:    "Joke",
	})
	require.NoError(t, err)
	into, err := env.ViewerStore.ApplyAward(store.ChatIdentity{Platform: "youtube", UserID: "into"}, 1, env.ConfigStore.Snapshot().DayResetHour, now)
	require.NoError(t, err)
	require.NoError(t, env.ViewerStore.Merge(from.ViewerID, into.ViewerID, env.ConfigStore.Snapshot().DayResetHour, now.Add(time.Second)))

	// Act / Assert
	for _, path := range []string{
		"/api/reward-history?limit=0",
		"/api/reward-history?limit=101",
		"/api/reward-history?limit=not-a-number",
		"/api/reward-history?cursor=not-a-cursor",
	} {
		rec := httptest.NewRecorder()
		env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
		assert.Equal(t, http.StatusBadRequest, rec.Code, path)
		assert.Contains(t, rec.Body.String(), `"error"`, path)
	}
	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/reward-history?viewer_id="+from.ViewerID, nil))
	assert.Equal(t, http.StatusNotFound, rec.Code)
	rec = httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/reward-history?viewer_id=unknown-viewer", nil))
	assert.Equal(t, http.StatusNotFound, rec.Code)
}

func TestAwardGrant_WhenEventInsertFails_ExpectNoSuccessfulGrantEffects(t *testing.T) {
	// Arrange
	env := newTestEnv(t, bus.New(0))
	srv := httptest.NewServer(env.Handler)
	t.Cleanup(srv.Close)
	conn, _, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(srv.URL, "http")+"/ws", nil)
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, conn.Close()) })
	_ = conn.SetReadDeadline(time.Now().Add(time.Second))
	_, _, err = conn.ReadMessage() // Initial leaderboard visibility frame.
	require.NoError(t, err)
	_, _, err = conn.ReadMessage() // Initial viewer contract state frame.
	require.NoError(t, err)
	_, _, err = conn.ReadMessage() // Initial stream recap state frame.
	require.NoError(t, err)
	viewerID := seedViewer(t, env, "twitch", "42", "Alice")
	before, err := env.ViewerStore.Get(viewerID, env.ConfigStore.Snapshot().DayResetHour, time.Now())
	require.NoError(t, err)
	eventsBefore, err := env.ViewerStore.ListInteractionEventsByViewer(viewerID)
	require.NoError(t, err)
	awardsBefore := observability.Default.Snapshot().AwardsGranted
	visibilityBefore, err := env.Visibility.Snapshot(context.Background())
	require.NoError(t, err)
	env.ViewerStore.SetInteractionEventInsertHookForTest(func() error { return errors.New("injected event failure") })
	t.Cleanup(func() { env.ViewerStore.SetInteractionEventInsertHookForTest(nil) })

	// Act
	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(
		http.MethodPost,
		"/api/awards/grant",
		strings.NewReader(`{"platform":"twitch","user_id":"42","award_id":"joke"}`),
	))

	// Assert
	require.Equal(t, http.StatusInternalServerError, rec.Code)
	after, err := env.ViewerStore.Get(viewerID, env.ConfigStore.Snapshot().DayResetHour, time.Now())
	require.NoError(t, err)
	assert.Equal(t, before.XP, after.XP)
	assert.Equal(t, before.SessionXP, after.SessionXP)
	assert.Equal(t, before.DayXP, after.DayXP)
	events, err := env.ViewerStore.ListInteractionEventsByViewer(viewerID)
	require.NoError(t, err)
	assert.Equal(t, eventsBefore, events)
	assert.Equal(t, awardsBefore, observability.Default.Snapshot().AwardsGranted)
	visibilityAfter, err := env.Visibility.Snapshot(context.Background())
	require.NoError(t, err)
	assert.Equal(t, visibilityBefore, visibilityAfter)
	_ = conn.SetReadDeadline(time.Now().Add(250 * time.Millisecond))
	_, _, readErr := conn.ReadMessage()
	assert.Error(t, readErr, "failed grant must not broadcast an award alert")
}

func mapKeys(value map[string]any) map[string]bool {
	keys := make(map[string]bool, len(value))
	for key := range value {
		keys[key] = true
	}
	return keys
}
