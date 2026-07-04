package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestConfig_WhenPatchVK_ExpectSaved(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)
	body := strings.NewReader(`{
  "server_port": 17877,
  "twitch": { "enabled": false, "channel": "" },
  "youtube": { "enabled": false, "oauth": { "client_id": "" } },
  "vk": { "enabled": true, "channel": "vkplay" },
  "overlay": { "max_messages": 30, "message_ttl_seconds": 20 },
  "admin": { "message_sound": { "enabled": false, "volume": 0.5, "sound": "chime" } }
}`)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/config/update", body)
	req.Header.Set("Content-Type", "application/json")
	handler.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)

	var payload map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	vk := payload["vk"].(map[string]any)
	require.Equal(t, true, vk["enabled"])
	require.Equal(t, "vkplay", vk["channel"])

	getRec := httptest.NewRecorder()
	handler.ServeHTTP(getRec, httptest.NewRequest(http.MethodGet, "/api/config", nil))
	require.Equal(t, http.StatusOK, getRec.Code)
	require.Contains(t, getRec.Body.String(), `"channel":"vkplay"`)
}
