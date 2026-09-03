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
	"github.com/mechastrider/comm-relay/internal/config"
)

func TestConfig_WhenNegativeActivityFields_ExpectFieldErrorsAndUnchanged(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))

	beforeRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(beforeRec, httptest.NewRequest(http.MethodGet, "/api/config", nil))
	require.Equal(t, http.StatusOK, beforeRec.Code)

	var before map[string]any
	require.NoError(t, json.Unmarshal(beforeRec.Body.Bytes(), &before))
	require.Equal(t, float64(300), before["activity_interval_seconds"])
	require.Equal(t, float64(10), before["activity_session_limit"])
	require.Equal(t, float64(1), before["activity_xp"])

	body := strings.NewReader(`{
  "server_port": 17877,
  "activity_interval_seconds": -1,
  "activity_session_limit": 10,
  "activity_xp": 1,
  "twitch": { "enabled": false, "channel": "" },
  "youtube": { "enabled": false, "oauth": { "client_id": "" } },
  "vk": { "enabled": false },
  "overlay": { "max_messages": 30, "message_ttl_seconds": 20 }
}`)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/config/update", body)
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)

	require.Equal(t, http.StatusBadRequest, rec.Code)

	var errPayload struct {
		Fields map[string]string `json:"fields"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &errPayload))
	require.Contains(t, errPayload.Fields, "activity_interval_seconds")

	afterRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(afterRec, httptest.NewRequest(http.MethodGet, "/api/config", nil))
	require.Equal(t, http.StatusOK, afterRec.Code)

	var after map[string]any
	require.NoError(t, json.Unmarshal(afterRec.Body.Bytes(), &after))
	require.Equal(t, before["activity_interval_seconds"], after["activity_interval_seconds"])
	require.Equal(t, before["activity_session_limit"], after["activity_session_limit"])
	require.Equal(t, before["activity_xp"], after["activity_xp"])
}

func TestViewerIngest_WhenLegacyPointsPerMessageOnly_ExpectNoPerMessageXP(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	time.Sleep(50 * time.Millisecond)

	require.NoError(t, env.ConfigStore.Mutate(func(cfg *config.Config) error {
		cfg.PointsPerMessage = 99
		cfg.ActivityXP = 0
		return nil
	}))

	require.NoError(t, env.Bus.Publish(bus.ChatMessageReceived(bus.ChatMessage{
		Platform: "twitch",
		UserID:   "legacy-points",
		Username: "Legacy",
		Message:  "hello",
	})))

	require.Eventually(t, func() bool {
		rec := httptest.NewRecorder()
		env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/viewers", nil))
		if rec.Code != http.StatusOK {
			return false
		}
		return strings.Contains(rec.Body.String(), `"user_id":"legacy-points"`)
	}, time.Second, 10*time.Millisecond)

	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/viewers", nil))
	require.Equal(t, http.StatusOK, rec.Code)

	var payload struct {
		Viewers []struct {
			LastSeen struct {
				UserID string `json:"user_id"`
			} `json:"last_seen"`
			SessionXP           int `json:"session_xp"`
			SessionMessageCount int `json:"session_message_count"`
			XP                  int `json:"xp"`
		} `json:"viewers"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))

	var found bool
	for _, viewer := range payload.Viewers {
		if viewer.LastSeen.UserID == "legacy-points" {
			found = true
			require.Equal(t, 1, viewer.SessionMessageCount)
			require.Equal(t, 0, viewer.SessionXP)
			require.Equal(t, 0, viewer.XP)
		}
	}
	require.True(t, found, "viewer with legacy-points user_id not found")
}
