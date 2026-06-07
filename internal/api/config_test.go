package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/connector/status"
	"github.com/stretchr/testify/require"
)

func TestConfig_WhenGet_ExpectCurrentSettings(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/config", nil))

	require.Equal(t, http.StatusOK, rec.Code)
	require.Contains(t, rec.Header().Get("Content-Type"), "application/json")

	var payload map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Equal(t, float64(17877), payload["server_port"])
}

func TestConfig_WhenPatchValid_ExpectSaved(t *testing.T) {
	t.Parallel()

	b := bus.New(0)
	handler := testHandlerWithBus(t, b)

	body := strings.NewReader(`{
  "server_port": 17877,
  "twitch": { "enabled": true, "channel": "streamer" },
  "youtube": { "enabled": false, "oauth": { "client_id": "" } },
  "vk": { "enabled": false },
  "overlay": { "max_messages": 25, "message_ttl_seconds": 15, "theme": "dashboard" }
}`)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/config", body)
	req.Header.Set("Content-Type", "application/json")
	handler.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)

	var payload map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	twitch := payload["twitch"].(map[string]any)
	require.Equal(t, true, twitch["enabled"])
	require.Equal(t, "streamer", twitch["channel"])
	overlay := payload["overlay"].(map[string]any)
	require.Equal(t, "dashboard", overlay["theme"])

	getRec := httptest.NewRecorder()
	handler.ServeHTTP(getRec, httptest.NewRequest(http.MethodGet, "/api/config", nil))
	require.Equal(t, http.StatusOK, getRec.Code)
	require.Contains(t, getRec.Body.String(), `"channel":"streamer"`)
	require.Contains(t, getRec.Body.String(), `"theme":"dashboard"`)
	require.NotContains(t, getRec.Body.String(), `"client_secret"`)
}

func TestConfig_WhenGet_ExpectYouTubeOAuthRedacted(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)

	patchBody := strings.NewReader(`{
  "server_port": 17877,
  "twitch": { "enabled": false, "channel": "" },
  "youtube": {
    "enabled": false,
    "oauth": {
      "client_id": "client-id",
      "client_secret": "top-secret",
      "refresh_token": "refresh-token"
    }
  },
  "vk": { "enabled": false },
  "overlay": { "max_messages": 30, "message_ttl_seconds": 20 }
}`)
	patchRec := httptest.NewRecorder()
	patchReq := httptest.NewRequest(http.MethodPatch, "/api/config", patchBody)
	patchReq.Header.Set("Content-Type", "application/json")
	handler.ServeHTTP(patchRec, patchReq)
	require.Equal(t, http.StatusOK, patchRec.Code)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/config", nil))
	require.Equal(t, http.StatusOK, rec.Code)
	require.NotContains(t, rec.Body.String(), "top-secret")
	require.NotContains(t, rec.Body.String(), "refresh-token")
	require.Contains(t, rec.Body.String(), `"has_client_secret":true`)
	require.Contains(t, rec.Body.String(), `"connected":true`)
}

func TestConfig_WhenPatchMessageSound_ExpectSaved(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)
	body := strings.NewReader(`{
  "server_port": 17877,
  "twitch": { "enabled": false, "channel": "" },
  "youtube": { "enabled": false, "oauth": { "client_id": "" } },
  "vk": { "enabled": false },
  "overlay": { "max_messages": 30, "message_ttl_seconds": 20 },
  "admin": {
    "message_sound": { "enabled": true, "volume": 0.25, "sound": "alert" }
  }
}`)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/config", body)
	req.Header.Set("Content-Type", "application/json")
	handler.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)

	var payload map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	admin := payload["admin"].(map[string]any)
	sound := admin["message_sound"].(map[string]any)
	require.Equal(t, true, sound["enabled"])
	require.InDelta(t, 0.25, sound["volume"], 0.001)
	require.Equal(t, "alert", sound["sound"])
}

func TestConfig_WhenPatchInvalidImagePreviewHost_ExpectFieldErrors(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)
	body := strings.NewReader(`{
  "server_port": 17877,
  "twitch": { "enabled": false, "channel": "" },
  "youtube": { "enabled": false, "oauth": { "client_id": "" } },
  "vk": { "enabled": false },
  "overlay": {
    "max_messages": 30,
    "message_ttl_seconds": 20,
    "image_previews": {
      "enabled": true,
      "allowed_hosts": ["bad/host"],
      "max_width_px": 320,
      "max_height_px": 180,
      "max_per_message": 1
    }
  }
}`)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/config", body)
	req.Header.Set("Content-Type", "application/json")
	handler.ServeHTTP(rec, req)

	require.Equal(t, http.StatusBadRequest, rec.Code)

	var payload struct {
		Error  string            `json:"error"`
		Fields map[string]string `json:"fields"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.NotEmpty(t, payload.Error)
	require.Contains(t, payload.Fields, "overlay_image_previews_allowed_hosts")
}

func TestConfig_WhenPatchInvalid_ExpectBadRequest(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)
	body := strings.NewReader(`{
  "server_port": 17877,
  "twitch": { "enabled": true, "channel": "" },
  "youtube": { "enabled": false, "oauth": { "client_id": "" } },
  "vk": { "enabled": false },
  "overlay": { "max_messages": 30, "message_ttl_seconds": 20 }
}`)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch, "/api/config", body)
	req.Header.Set("Content-Type", "application/json")
	handler.ServeHTTP(rec, req)

	require.Equal(t, http.StatusBadRequest, rec.Code)

	var payload struct {
		Error  string            `json:"error"`
		Fields map[string]string `json:"fields"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.NotEmpty(t, payload.Error)
	require.Contains(t, payload.Fields, "twitch_channel")
}

func TestStatus_WhenGet_ExpectConnectorStates(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/status", nil))

	require.Equal(t, http.StatusOK, rec.Code)

	var payload map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	twitch := payload["twitch"].(map[string]any)
	require.Equal(t, "disabled", twitch["state"])
	require.Equal(t, float64(0), twitch["message_count"])
}

func TestStatus_WhenRegistryConnected_ExpectLiveState(t *testing.T) {
	t.Parallel()

	b := bus.New(0)
	hub, err := NewHub(b)
	require.NoError(t, err)

	registry := status.NewRegistry()
	registry.SetTwitch(status.Snapshot{
		State:        status.StateConnected,
		LastError:    "",
		MessageCount: 5,
	})

	store := testConfigStore(t)
	updated := store.Snapshot()
	updated.Twitch.Enabled = true
	updated.Twitch.Channel = "streamer"
	require.NoError(t, store.Replace(updated))

	handler, err := NewHandler(Options{
		Hub:      hub,
		Store:    store,
		History:  NewMessageHistory(0),
		Registry: registry,
	})
	require.NoError(t, err)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/status", nil))
	require.Equal(t, http.StatusOK, rec.Code)

	var payload map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	twitch := payload["twitch"].(map[string]any)
	require.Equal(t, "connected", twitch["state"])
	require.Equal(t, float64(5), twitch["message_count"])
}

func TestMessagesRecent_WhenPublished_ExpectChronologicalList(t *testing.T) {
	t.Parallel()

	b := bus.New(0)
	handler := testHandlerWithBus(t, b)

	time.Sleep(50 * time.Millisecond)

	require.NoError(t, b.Publish(bus.ChatMessageReceived(bus.ChatMessage{
		Platform: "twitch",
		Username: "first",
		Message:  "one",
	})))
	require.NoError(t, b.Publish(bus.ChatMessageReceived(bus.ChatMessage{
		Platform: "twitch",
		Username: "second",
		Message:  "two",
	})))

	require.Eventually(t, func() bool {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/messages/recent?limit=10", nil))
		if rec.Code != http.StatusOK {
			return false
		}

		var payload struct {
			Messages []struct {
				Username string `json:"username"`
				Message  string `json:"message"`
			} `json:"messages"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
			return false
		}
		return len(payload.Messages) == 2
	}, time.Second, 10*time.Millisecond)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/messages/recent?limit=10", nil))
	require.Equal(t, http.StatusOK, rec.Code)

	var payload struct {
		Messages []struct {
			Username string `json:"username"`
			Message  string `json:"message"`
		} `json:"messages"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Len(t, payload.Messages, 2)
	require.Equal(t, "first", payload.Messages[0].Username)
	require.Equal(t, "second", payload.Messages[1].Username)
}

func TestMessagesRecent_WhenPublishedWithFragments_ExpectFragmentsInResponse(t *testing.T) {
	t.Parallel()

	b := bus.New(0)
	handler := testHandlerWithBus(t, b)

	time.Sleep(50 * time.Millisecond)

	require.NoError(t, b.Publish(bus.ChatMessageReceived(bus.ChatMessage{
		Platform: "twitch",
		Username: "viewer",
		Message:  "Kappa",
		Fragments: []bus.MessageFragment{
			{Type: bus.FragmentTypeEmote, Text: "Kappa", URL: "https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0"},
		},
	})))

	require.Eventually(t, func() bool {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/messages/recent?limit=5", nil))
		if rec.Code != http.StatusOK {
			return false
		}

		var payload struct {
			Messages []struct {
				Message   string `json:"message"`
				Fragments []struct {
					Type string `json:"type"`
					Text string `json:"text"`
					URL  string `json:"url"`
				} `json:"fragments"`
			} `json:"messages"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
			return false
		}
		return len(payload.Messages) == 1 && len(payload.Messages[0].Fragments) == 1
	}, time.Second, 10*time.Millisecond)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/messages/recent?limit=5", nil))
	require.Equal(t, http.StatusOK, rec.Code)

	var payload struct {
		Messages []struct {
			Message   string `json:"message"`
			Fragments []struct {
				Type string `json:"type"`
				Text string `json:"text"`
				URL  string `json:"url"`
			} `json:"fragments"`
		} `json:"messages"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Len(t, payload.Messages, 1)
	require.Equal(t, "Kappa", payload.Messages[0].Message)
	require.Len(t, payload.Messages[0].Fragments, 1)
	require.Equal(t, "emote", payload.Messages[0].Fragments[0].Type)
	require.Equal(t, "Kappa", payload.Messages[0].Fragments[0].Text)
	require.Contains(t, payload.Messages[0].Fragments[0].URL, "jtvnw.net")
}
