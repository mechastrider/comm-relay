package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
)

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
