package api

import (
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/store"
)

func TestLiveEvents_WhenAwardExists_ExpectCuratedFields(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	_, err := env.ViewerStore.GrantAward(store.GrantAwardInput{Identity: store.ChatIdentity{Platform: "twitch", UserID: "v", DisplayName: "Viewer"}, AwardID: "spotter", AwardName: "Spotter", Points: 5, MessageID: "private-message", MessagePlatform: "twitch", Now: time.Now()})
	require.NoError(t, err)
	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest("GET", "/api/live-events", nil))
	var page store.LiveEventsPage
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &page))
	require.NotEmpty(t, page.Entries)
	require.Equal(t, "award", page.Entries[0].Kind)
	require.Equal(t, "Viewer", page.Entries[0].ViewerName)
	require.NotContains(t, rec.Body.String(), "private-message")
	require.NotContains(t, rec.Body.String(), "message_id")
}

func TestLiveEvents_WhenQueryInvalid_ExpectBadRequest(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	for _, query := range []string{"limit=0", "limit=101", "limit=bad", "limit=", "category=unknown", "cursor=bad"} {
		t.Run(query, func(t *testing.T) {
			rec := httptest.NewRecorder()
			env.Handler.ServeHTTP(rec, httptest.NewRequest("GET", "/api/live-events?"+query, nil))
			require.Equal(t, 400, rec.Code)
		})
	}
}

func TestLiveEvents_WhenEmpty_ExpectJSONArray(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest("GET", "/api/live-events", nil))
	require.Equal(t, 200, rec.Code)
	require.Contains(t, rec.Body.String(), `"entries":[]`)
}
