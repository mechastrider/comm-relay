package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestConfig_WhenProxySettingsSaved_ExpectRoundTrip(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)

	body := strings.NewReader(`{
  "server_port": 17877,
  "network": {
    "socks5": {
      "address": "127.0.0.1:1080",
      "username": "proxy-user",
      "password": "proxy-secret"
    }
  },
  "twitch": { "enabled": false, "channel": "" },
  "youtube": { "enabled": true, "use_proxy": true, "oauth": { "client_id": "" } },
  "vk": { "enabled": true, "channel": "vkplay", "use_proxy": false },
  "overlay": { "max_messages": 30, "message_ttl_seconds": 20, "theme": "default" }
}`)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/config/update", body)
	req.Header.Set("Content-Type", "application/json")
	handler.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)

	var payload map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))

	network := payload["network"].(map[string]any)
	socks5 := network["socks5"].(map[string]any)
	require.Equal(t, "127.0.0.1:1080", socks5["address"])
	require.Equal(t, "proxy-user", socks5["username"])
	require.True(t, socks5["has_password"].(bool))
	require.NotContains(t, payload, "password")

	youtube := payload["youtube"].(map[string]any)
	require.Equal(t, true, youtube["use_proxy"])

	vk := payload["vk"].(map[string]any)
	require.Equal(t, false, vk["use_proxy"])
}

func TestConfig_WhenUseProxyWithoutAddress_ExpectValidationError(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)

	body := strings.NewReader(`{
  "server_port": 17877,
  "network": { "socks5": { "address": "" } },
  "twitch": { "enabled": false, "channel": "" },
  "youtube": { "enabled": false, "use_proxy": true, "oauth": { "client_id": "" } },
  "vk": { "enabled": false },
  "overlay": { "max_messages": 30, "message_ttl_seconds": 20, "theme": "default" }
}`)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/config/update", body)
	req.Header.Set("Content-Type", "application/json")
	handler.ServeHTTP(rec, req)

	require.Equal(t, http.StatusBadRequest, rec.Code)

	var payload fieldErrorResponse
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Contains(t, payload.Fields, "network_socks5_address")
}

func TestConfig_WhenProxyPasswordBlank_ExpectPreviousPasswordKept(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)

	first := strings.NewReader(`{
  "server_port": 17877,
  "network": { "socks5": { "address": "127.0.0.1:1080", "password": "keep-me" } },
  "twitch": { "enabled": false, "channel": "" },
  "youtube": { "enabled": true, "use_proxy": true, "oauth": { "client_id": "" } },
  "vk": { "enabled": false },
  "overlay": { "max_messages": 30, "message_ttl_seconds": 20, "theme": "default" }
}`)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/config/update", first))
	require.Equal(t, http.StatusOK, rec.Code)

	second := strings.NewReader(`{
  "server_port": 17877,
  "network": { "socks5": { "address": "127.0.0.1:1080", "password": "" } },
  "twitch": { "enabled": false, "channel": "" },
  "youtube": { "enabled": true, "use_proxy": true, "oauth": { "client_id": "" } },
  "vk": { "enabled": false },
  "overlay": { "max_messages": 30, "message_ttl_seconds": 20, "theme": "default" }
}`)
	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/config/update", second))
	require.Equal(t, http.StatusOK, rec.Code)

	var payload map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	network := payload["network"].(map[string]any)
	socks5 := network["socks5"].(map[string]any)
	require.True(t, socks5["has_password"].(bool))
}

type fieldErrorResponse struct {
	Fields map[string]string `json:"fields"`
}
