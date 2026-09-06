package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
)

func TestConfig_WhenSurfaceOpacityOverridesUpdated_ExpectPublicRoundTripAndUnrelatedFieldsPreserved(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	require.NoError(t, env.ConfigStore.Mutate(func(current *config.Config) error {
		current.Twitch.Channel = "preserved-channel"
		current.YouTube.OAuth.RefreshToken = "preserved-token"
		return nil
	}))

	body := strings.NewReader(`{
  "server_port": 17877,
  "twitch": { "enabled": false, "channel": "preserved-channel" },
  "youtube": { "enabled": false, "oauth": { "client_id": "" } },
  "vk": { "enabled": false },
  "overlay": {
    "active_preset_id": "default",
    "presets": [{
      "id": "default", "name": "Default", "max_messages": 30,
      "message_ttl_seconds": 20, "font_size_px": 18, "display_mode": "normal", "theme": "default",
      "style": { "font_family": "system", "line_height": 1.35, "text_edge": "shadow", "text_edge_strength": 2, "platform_marker": "stripe", "panel_color": "#000000", "panel_opacity": 0.58, "border_width": 0, "border_color": "#ffffff", "border_radius": 8 },
      "surfaces": {
        "chat": { "panel_opacity": 0 },
        "leaderboard": { "panel_opacity": 0.35 },
        "alerts": { "panel_opacity": 1 }
      }
    }]
  }
}`)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/config/update", body)
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	var payload map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	preset := payload["overlay"].(map[string]any)["presets"].([]any)[0].(map[string]any)
	surfaces := preset["surfaces"].(map[string]any)
	require.Equal(t, float64(0), surfaces["chat"].(map[string]any)["panel_opacity"])
	require.Equal(t, 0.35, surfaces["leaderboard"].(map[string]any)["panel_opacity"])
	require.Equal(t, float64(1), surfaces["alerts"].(map[string]any)["panel_opacity"])
	require.Equal(t, "preserved-channel", env.ConfigStore.Snapshot().Twitch.Channel)
	require.Equal(t, "preserved-token", env.ConfigStore.Snapshot().YouTube.OAuth.RefreshToken)
}

func TestConfig_WhenSurfaceOpacityInvalid_ExpectAtomicRejection(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	before := env.ConfigStore.Snapshot()
	body := strings.NewReader(`{
  "server_port": 17877,
  "twitch": { "enabled": false, "channel": "" },
  "youtube": { "enabled": false, "oauth": { "client_id": "" } },
  "vk": { "enabled": false },
  "overlay": {
    "active_preset_id": "default",
    "presets": [{
      "id": "default", "name": "Default", "max_messages": 30,
      "message_ttl_seconds": 20, "font_size_px": 18, "display_mode": "normal", "theme": "default",
      "style": { "font_family": "system", "line_height": 1.35, "text_edge": "shadow", "text_edge_strength": 2, "platform_marker": "stripe", "panel_color": "#000000", "panel_opacity": 0.58, "border_width": 0, "border_color": "#ffffff", "border_radius": 8 },
      "surfaces": { "alerts": { "panel_opacity": 1.2 } }
    }]
  }
}`)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/config/update", body)
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusBadRequest, rec.Code)
	require.Contains(t, rec.Body.String(), "overlay_preset_0_surfaces_alerts_panel_opacity")
	require.Equal(t, before, env.ConfigStore.Snapshot())
}

func TestConfig_WhenLeaderboardPresentationUpdated_ExpectPublicRoundTripAndSecretsOmitted(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	require.NoError(t, env.ConfigStore.Mutate(func(current *config.Config) error {
		current.YouTube.OAuth.ClientSecret = "top-secret"
		current.YouTube.OAuth.RefreshToken = "refresh-token"
		return nil
	}))

	body := strings.NewReader(`{
  "server_port": 17877,
  "twitch": { "enabled": false, "channel": "" },
  "youtube": { "enabled": false, "oauth": { "client_id": "" } },
  "vk": { "enabled": false },
  "overlay": {
    "active_preset_id": "default",
    "presets": [{
      "id": "default", "name": "Default", "max_messages": 30,
      "message_ttl_seconds": 20, "font_size_px": 18, "display_mode": "normal", "theme": "default",
      "style": { "font_family": "system", "line_height": 1.35, "text_edge": "shadow", "text_edge_strength": 2, "platform_marker": "stripe", "panel_color": "#000000", "panel_opacity": 0.58, "border_width": 0, "border_color": "#ffffff", "border_radius": 8 },
      "surfaces": {
        "leaderboard": {
          "sizing_mode": "fixed", "font_size_px": 16, "layout": "chips",
          "title_mode": "custom", "title": "Топ эфира",
          "show_message_count": true, "max_entries": 8
        }
      }
    }]
  }
}`)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/config/update", body)
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	require.Contains(t, rec.Body.String(), `"sizing_mode":"fixed"`)
	require.Contains(t, rec.Body.String(), `"title_mode":"custom"`)
	require.Contains(t, rec.Body.String(), `"show_message_count":true`)
	require.Contains(t, rec.Body.String(), `"max_entries":8`)
	require.NotContains(t, rec.Body.String(), "top-secret")
	require.NotContains(t, rec.Body.String(), "refresh-token")
}

func TestConfig_WhenLeaderboardPresentationInvalid_ExpectAtomicRejection(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	before := env.ConfigStore.Snapshot()
	body := strings.NewReader(`{
  "server_port": 17877,
  "twitch": { "enabled": false, "channel": "" },
  "youtube": { "enabled": false, "oauth": { "client_id": "" } },
  "vk": { "enabled": false },
  "overlay": {
    "active_preset_id": "default",
    "presets": [{
      "id": "default", "name": "Default", "max_messages": 30,
      "message_ttl_seconds": 20, "font_size_px": 18, "display_mode": "normal", "theme": "default",
      "surfaces": { "leaderboard": { "sizing_mode": "fluid", "title_mode": "custom", "title": " " } }
    }]
  }
}`)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/config/update", body)
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusBadRequest, rec.Code)
	require.Contains(t, rec.Body.String(), "overlay_preset_0_surfaces_leaderboard_sizing_mode")
	require.Contains(t, rec.Body.String(), "overlay_preset_0_surfaces_leaderboard_title")
	require.Equal(t, before, env.ConfigStore.Snapshot())
}

func TestConfig_WhenLegacyLeaderboardPublishedUnchanged_ExpectModesRemainOmitted(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	require.NoError(t, env.ConfigStore.Mutate(func(current *config.Config) error {
		current.Overlay.Presets[0].Surfaces.Leaderboard.FontSizePx = 14
		current.Overlay.Presets[0].Surfaces.Leaderboard.Title = "Legacy title"
		return nil
	}))

	body, err := json.Marshal(env.ConfigStore.Snapshot().Public())
	require.NoError(t, err)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/config/update", strings.NewReader(string(body)))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	leaderboard := env.ConfigStore.Snapshot().Overlay.Presets[0].Surfaces.Leaderboard
	require.Empty(t, leaderboard.SizingMode)
	require.Empty(t, leaderboard.TitleMode)
	require.Equal(t, 14, leaderboard.FontSizePx)
	require.Equal(t, "Legacy title", leaderboard.Title)
	require.NotContains(t, rec.Body.String(), `"sizing_mode"`)
	require.NotContains(t, rec.Body.String(), `"title_mode"`)
}

func TestConfig_WhenSurfaceOpacityHasMalformedType_ExpectAtomicBadRequest(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	before := env.ConfigStore.Snapshot()
	body := strings.NewReader(`{
  "server_port": 17877,
  "twitch": { "enabled": false, "channel": "" },
  "youtube": { "enabled": false, "oauth": { "client_id": "" } },
  "vk": { "enabled": false },
  "overlay": {
    "active_preset_id": "default",
    "presets": [{
      "id": "default", "name": "Default", "max_messages": 30,
      "message_ttl_seconds": 20, "font_size_px": 18, "display_mode": "normal", "theme": "default",
      "surfaces": { "chat": { "panel_opacity": "opaque" } }
    }]
  }
}`)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/config/update", body)
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusBadRequest, rec.Code)
	require.Equal(t, before, env.ConfigStore.Snapshot())
}

func TestConfig_WhenPatchWithoutPresets_ExpectExistingPresetsKept(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	handler := env.Handler

	require.NoError(t, env.ConfigStore.Mutate(func(current *config.Config) error {
		streamMain := current.Overlay.Presets[0]
		streamMain.ID = "stream-main"
		streamMain.Name = "Stream"
		streamMain.Theme = config.OverlayThemeDashboard
		current.Overlay.Presets = append(current.Overlay.Presets, streamMain)
		current.Overlay.ActivePresetID = "stream-main"
		return nil
	}))

	patch := strings.NewReader(`{
  "server_port": 17877,
  "twitch": { "enabled": true, "channel": "streamer" },
  "youtube": { "enabled": false, "oauth": { "client_id": "" } },
  "vk": { "enabled": false },
  "overlay": { "max_messages": 25, "message_ttl_seconds": 15, "theme": "cockpit_popups" }
}`)
	patchRec := httptest.NewRecorder()
	patchReq := httptest.NewRequest(http.MethodPost, "/api/config/update", patch)
	patchReq.Header.Set("Content-Type", "application/json")
	handler.ServeHTTP(patchRec, patchReq)
	require.Equal(t, http.StatusOK, patchRec.Code, patchRec.Body.String())

	saved := env.ConfigStore.Snapshot()
	require.Len(t, saved.Overlay.Presets, 2)
	require.Equal(t, "stream-main", saved.Overlay.ActivePresetID)
	preset, ok := saved.Overlay.PresetByID("stream-main")
	require.True(t, ok)
	require.Equal(t, config.OverlayThemeCockpitPopups, preset.Theme)
	require.Equal(t, 25, preset.MaxMessages)
}
