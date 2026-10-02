package api

import (
	"encoding/json"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
)

func seedOverlayPreset(t *testing.T, store *config.Store) {
	t.Helper()

	require.NoError(t, store.Mutate(func(current *config.Config) error {
		streamMain := current.Overlay.Presets[0]
		streamMain.ID = "stream-main"
		streamMain.Name = "Stream Main"
		streamMain.Theme = config.OverlayThemeDashboard
		current.Overlay.Presets = append(current.Overlay.Presets, streamMain)
		return nil
	}))
}

func postOverlayActivate(t *testing.T, handler http.Handler, body string) *httptest.ResponseRecorder {
	t.Helper()

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/overlay/activate", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	handler.ServeHTTP(rec, req)
	return rec
}

func connectOverlayWS(t *testing.T, srv *httptest.Server) *websocket.Conn {
	t.Helper()

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })
	return conn
}

func connectDebugOverlayWS(t *testing.T, srv *httptest.Server) *websocket.Conn {
	t.Helper()

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws/overlay-debug"
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })
	return conn
}

// Read the known initial snapshots without poisoning the connection with a timeout.
func readInitialOverlayFrames(t *testing.T, conn *websocket.Conn) {
	t.Helper()
	require.NoError(t, conn.SetReadDeadline(time.Now().Add(time.Second)))
	for _, expected := range []string{wireLeaderboardVisibilityType, wireViewerContractStateType, wireStreamRecapStateType} {
		_, data, err := conn.ReadMessage()
		require.NoError(t, err)
		var frame map[string]any
		require.NoError(t, json.Unmarshal(data, &frame))
		require.Equal(t, expected, frame["type"])
	}
}

func readOverlaySettingsEventually(t *testing.T, conn *websocket.Conn, activePresetID string) map[string]any {
	t.Helper()

	deadline := time.Now().Add(5 * time.Second)
	require.NoError(t, conn.SetReadDeadline(deadline))
	for time.Now().Before(deadline) {
		_, data, err := conn.ReadMessage()
		require.NoError(t, err, "expected overlay_settings for preset %s", activePresetID)
		var frame map[string]any
		require.NoError(t, json.Unmarshal(data, &frame))
		if frame["type"] != "overlay_settings" {
			continue
		}
		overlay, ok := frame["overlay"].(map[string]any)
		if ok && overlay["active_preset_id"] == activePresetID {
			return frame
		}
	}
	t.Fatalf("expected overlay_settings for preset %s before deadline", activePresetID)
	return nil
}

func postOverlayActivateURL(t *testing.T, url, body string) *http.Response {
	t.Helper()

	req, err := http.NewRequest(http.MethodPost, url, strings.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	t.Cleanup(func() { _ = resp.Body.Close() })
	return resp
}

func TestOverlayActivate_WhenValid_ExpectPublicConfigAndNoSecrets(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	seedOverlayPreset(t, env.ConfigStore)

	require.NoError(t, env.ConfigStore.Mutate(func(current *config.Config) error {
		current.YouTube.OAuth.ClientID = "client-id"
		current.YouTube.OAuth.ClientSecret = "top-secret"
		current.YouTube.OAuth.RefreshToken = "refresh-token"
		return nil
	}))

	rec := postOverlayActivate(t, env.Handler, `{"preset_id":"stream-main"}`)
	require.Equal(t, http.StatusOK, rec.Code)
	require.NotContains(t, rec.Body.String(), "top-secret")
	require.NotContains(t, rec.Body.String(), "refresh-token")
	require.Contains(t, rec.Body.String(), `"has_client_secret":true`)

	var payload map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	overlay := payload["overlay"].(map[string]any)
	require.Equal(t, "stream-main", overlay["active_preset_id"])
}

func TestOverlayActivate_WhenBlank_ExpectBadRequestAndUnchanged(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	seedOverlayPreset(t, env.ConfigStore)
	before := env.ConfigStore.Snapshot()

	rec := postOverlayActivate(t, env.Handler, `{"preset_id":""}`)
	require.Equal(t, http.StatusBadRequest, rec.Code)
	require.Contains(t, rec.Body.String(), `"error"`)
	require.Equal(t, before, env.ConfigStore.Snapshot())
}

func TestOverlayActivate_WhenUnknown_ExpectBadRequestAndUnchanged(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	seedOverlayPreset(t, env.ConfigStore)
	before := env.ConfigStore.Snapshot()

	rec := postOverlayActivate(t, env.Handler, `{"preset_id":"missing-preset"}`)
	require.Equal(t, http.StatusBadRequest, rec.Code)
	require.Contains(t, rec.Body.String(), `"error"`)
	require.Equal(t, before, env.ConfigStore.Snapshot())
}

func TestOverlayActivate_WhenMalformedJSON_ExpectInvalidJSON(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))

	rec := postOverlayActivate(t, env.Handler, `{not json`)
	require.Equal(t, http.StatusBadRequest, rec.Code)
	require.JSONEq(t, `{"error":"invalid JSON"}`, rec.Body.String())
}

func TestOverlayActivate_WhenExtraField_ExpectSuccess(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	seedOverlayPreset(t, env.ConfigStore)

	rec := postOverlayActivate(t, env.Handler, `{"preset_id":"stream-main","ignored":"value"}`)
	require.Equal(t, http.StatusOK, rec.Code)

	var payload map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	overlay := payload["overlay"].(map[string]any)
	require.Equal(t, "stream-main", overlay["active_preset_id"])
}

func TestOverlayActivate_WhenFailure_ExpectNoOverlaySettingsBroadcast(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	seedOverlayPreset(t, env.ConfigStore)

	srv := httptest.NewServer(env.Handler)
	t.Cleanup(srv.Close)

	conn := connectOverlayWS(t, srv)
	readInitialOverlayFrames(t, conn)

	rec := postOverlayActivate(t, env.Handler, `{"preset_id":"missing-preset"}`)
	require.Equal(t, http.StatusBadRequest, rec.Code)

	require.NoError(t, conn.SetReadDeadline(time.Now().Add(200*time.Millisecond)))
	_, _, err := conn.ReadMessage()
	var timeout net.Error
	require.ErrorAs(t, err, &timeout)
	require.True(t, timeout.Timeout(), "expected no WebSocket frame before deadline")
}

func TestOverlayActivate_WhenValid_ExpectOverlaySettingsBroadcastToTwoClients(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	seedOverlayPreset(t, env.ConfigStore)

	srv := httptest.NewServer(env.Handler)
	t.Cleanup(srv.Close)

	conn1 := connectOverlayWS(t, srv)
	conn2 := connectOverlayWS(t, srv)
	readInitialOverlayFrames(t, conn1)
	readInitialOverlayFrames(t, conn2)

	resp := postOverlayActivateURL(t, srv.URL+"/api/overlay/activate", `{"preset_id":"stream-main"}`)
	require.Equal(t, http.StatusOK, resp.StatusCode)

	frame1 := readOverlaySettingsEventually(t, conn1, "stream-main")
	frame2 := readOverlaySettingsEventually(t, conn2, "stream-main")

	overlay1 := frame1["overlay"].(map[string]any)
	overlay2 := frame2["overlay"].(map[string]any)
	require.Equal(t, "stream-main", overlay1["active_preset_id"])
	require.Equal(t, "stream-main", overlay2["active_preset_id"])
}

func TestOverlayActivate_WhenValid_ExpectSettingsOnProductionAndDebugAudiencesOnly(t *testing.T) {
	t.Parallel()

	// Arrange
	env := newTestEnv(t, bus.New(0))
	seedOverlayPreset(t, env.ConfigStore)
	srv := httptest.NewServer(env.Handler)
	t.Cleanup(srv.Close)
	production := connectOverlayWS(t, srv)
	readInitialOverlayFrames(t, production)
	debug := connectDebugOverlayWS(t, srv)
	initialDebugSettings := readWebSocketFrame(t, debug)
	require.Equal(t, wireOverlaySettingsType, initialDebugSettings["type"])

	// Act
	resp := postOverlayActivateURL(t, srv.URL+"/api/overlay/activate", `{"preset_id":"stream-main"}`)
	require.Equal(t, http.StatusOK, resp.StatusCode)

	// Assert: both sockets receive the same active-preset appearance without reload.
	productionSettings := readOverlaySettingsEventually(t, production, "stream-main")
	debugSettings := readOverlaySettingsEventually(t, debug, "stream-main")
	require.Equal(t, productionSettings, debugSettings)

	// Preserve content isolation while settings remain shared.
	require.NoError(t, env.Bus.Publish(bus.ChatMessageReceived(bus.ChatMessage{
		ID: "live-after-activate", Platform: "twitch", Username: "Live", Message: "production only",
	})))
	require.Equal(t, wireMessageType, readWebSocketFrameSkippingLeaderboard(t, production)["type"])
	assertNoWebSocketFrame(t, debug)
}

func TestOverlayActivate_WhenSaveFails_ExpectServerErrorAndNoBroadcast(t *testing.T) {
	t.Parallel()

	env := newTestEnv(t, bus.New(0))
	seedOverlayPreset(t, env.ConfigStore)
	require.NoError(t, env.ConfigStore.ActivatePreset("stream-main"))

	dir := filepath.Dir(env.ConfigStore.Path())
	require.NoError(t, os.Chmod(dir, 0o555))
	t.Cleanup(func() { _ = os.Chmod(dir, 0o755) })

	srv := httptest.NewServer(env.Handler)
	t.Cleanup(srv.Close)

	conn := connectOverlayWS(t, srv)
	readInitialOverlayFrames(t, conn)

	rec := postOverlayActivate(t, env.Handler, `{"preset_id":"`+config.OverlayDefaultPresetID+`"}`)
	if rec.Code == http.StatusInternalServerError {
		require.Contains(t, rec.Body.String(), `"failed to save settings"`)
		require.NoError(t, conn.SetReadDeadline(time.Now().Add(200*time.Millisecond)))
		_, _, err := conn.ReadMessage()
		var timeout net.Error
		require.ErrorAs(t, err, &timeout)
		require.True(t, timeout.Timeout(), "expected no WebSocket frame before deadline")
		return
	}

	require.Equal(t, http.StatusOK, rec.Code, "chmod did not block save on this filesystem; skipping strict 500 assertion")
}

func TestOverlayActivate_WhenBlank_ExpectRouteRegistered(t *testing.T) {
	t.Parallel()

	handler := testHandler(t)
	rec := postOverlayActivate(t, handler, `{"preset_id":""}`)
	require.Equal(t, http.StatusBadRequest, rec.Code)
}
