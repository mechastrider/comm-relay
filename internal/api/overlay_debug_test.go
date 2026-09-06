package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
)

func TestOverlayDebugFire_WhenValidBoundaries_ExpectStartedAndProductionShapedFrames(t *testing.T) {
	// Arrange
	hub, err := NewHub(bus.New(0), nil, nil, nil)
	require.NoError(t, err)
	client := registerDebugTestClient(hub, ClientSendBuffer)
	handler := newOverlayDebugHandler(hub)
	body := `{"scenario":"leaderboard_update","display_name":"` + strings.Repeat("n", 64) + `","message":"` + strings.Repeat("m", 500) + `","label":"` + strings.Repeat("l", 80) + `","points":1000}`

	// Act
	rec := httptest.NewRecorder()
	handler.handleFire(rec, httptest.NewRequest(http.MethodPost, "/api/overlay-debug/scenario/fire", strings.NewReader(body)))

	// Assert
	require.Equal(t, http.StatusOK, rec.Code)
	var response overlayDebugStartedResponse
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
	require.Equal(t, "started", response.Status)
	require.NotEmpty(t, response.RunID)
	require.Equal(t, 1, response.DeliveredClients)
	require.Equal(t, debugResetType, frameType(t, <-client.send))
	frame := decodeFrame(t, <-client.send)
	require.Equal(t, wireLeaderboardType, frame["type"])
	entries, ok := frame["entries"].([]any)
	require.True(t, ok)
	require.Len(t, entries, 3)
	first := entries[0].(map[string]any)
	require.Equal(t, float64(1000), first["xp"])

	lowRec := httptest.NewRecorder()
	handler.handleFire(lowRec, httptest.NewRequest(http.MethodPost, "/api/overlay-debug/scenario/fire", strings.NewReader(`{"scenario":"leaderboard_update","points":1}`)))
	require.Equal(t, http.StatusOK, lowRec.Code)
	require.Equal(t, debugResetType, frameType(t, <-client.send))
	lowFrame := decodeFrame(t, <-client.send)
	lowEntries := lowFrame["entries"].([]any)
	require.Equal(t, float64(1), lowEntries[0].(map[string]any)["xp"])
}

func TestOverlayDebugFire_WhenInvalidInput_ExpectBadRequestAndNoFrames(t *testing.T) {
	// Arrange
	hub, err := NewHub(bus.New(0), nil, nil, nil)
	require.NoError(t, err)
	client := registerDebugTestClient(hub, ClientSendBuffer)
	handler := newOverlayDebugHandler(hub)

	tests := map[string]string{
		"unknown scenario":   `{"scenario":"arbitrary"}`,
		"name over limit":    `{"scenario":"message","display_name":"` + strings.Repeat("n", 65) + `"}`,
		"message over limit": `{"scenario":"message","message":"` + strings.Repeat("m", 501) + `"}`,
		"label over limit":   `{"scenario":"message","label":"` + strings.Repeat("l", 81) + `"}`,
		"points below limit": `{"scenario":"message","points":0}`,
		"points above limit": `{"scenario":"message","points":1001}`,
		"non integer points": `{"scenario":"message","points":1.5}`,
		"malformed JSON":     `{"scenario":`,
		"unknown field":      `{"scenario":"message","unexpected":true}`,
		"trailing JSON":      `{"scenario":"message"} {}`,
	}

	for name, body := range tests {
		t.Run(name, func(t *testing.T) {
			// Act
			rec := httptest.NewRecorder()
			handler.handleFire(rec, httptest.NewRequest(http.MethodPost, "/api/overlay-debug/scenario/fire", strings.NewReader(body)))

			// Assert
			require.Equal(t, http.StatusBadRequest, rec.Code)
			require.Equal(t, 0, len(client.send))
		})
	}
}

func TestOverlayDebugReset_WhenBodyIsNotEmptyObject_ExpectBadRequest(t *testing.T) {
	// Arrange
	hub, err := NewHub(bus.New(0), nil, nil, nil)
	require.NoError(t, err)
	client := registerDebugTestClient(hub, ClientSendBuffer)
	handler := newOverlayDebugHandler(hub)

	for name, body := range map[string]string{
		"routing key":    `{"session_id":"other"}`,
		"unknown field":  `{"unexpected":true}`,
		"malformed JSON": `{`,
		"trailing JSON":  `{} {}`,
		"non object":     `null`,
	} {
		t.Run(name, func(t *testing.T) {
			// Act
			rec := httptest.NewRecorder()
			handler.handleReset(rec, httptest.NewRequest(http.MethodPost, "/api/overlay-debug/session/reset", strings.NewReader(body)))

			// Assert
			require.Equal(t, http.StatusBadRequest, rec.Code)
			require.Zero(t, len(client.send))
		})
	}

	for _, body := range []string{"", "{}"} {
		// Act
		rec := httptest.NewRecorder()
		handler.handleReset(rec, httptest.NewRequest(http.MethodPost, "/api/overlay-debug/session/reset", strings.NewReader(body)))

		// Assert
		require.Equal(t, http.StatusOK, rec.Code)
		var response overlayDebugResetResponse
		require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
		require.Equal(t, overlayDebugResetResponse{Status: "reset", DeliveredClients: 1}, response)
		require.Equal(t, debugResetType, frameType(t, <-client.send))
	}
}

func TestOverlayDebugRunner_WhenAudiencesReceiveFrames_ExpectIsolationAndSlowClientPolicy(t *testing.T) {
	// Arrange
	hub, err := NewHub(bus.New(0), nil, nil, nil)
	require.NoError(t, err)
	production := &wsClient{hub: hub, send: make(chan []byte, ClientSendBuffer)}
	hub.register(production)
	slow := registerDebugTestClient(hub, 1)
	fast := registerDebugTestClient(hub, ClientSendBuffer)
	slow.send <- []byte("full")
	runner := newOverlayDebugRunner(hub)

	// Act
	response, err := runner.fire(overlayDebugRequest{Scenario: debugScenarioMessage})

	// Assert
	require.NoError(t, err)
	require.Equal(t, 1, response.DeliveredClients)
	require.Equal(t, 0, len(production.send), "debug frames must not use the production audience")
	require.Equal(t, 1, len(slow.send), "a full debug queue must keep the existing drop policy")
	require.Equal(t, debugResetType, frameType(t, <-fast.send))
	require.Equal(t, wireMessageType, frameType(t, <-fast.send))

	hub.Broadcast([]byte(`{"type":"message"}`))
	require.Equal(t, wireMessageType, frameType(t, <-production.send))
	require.Equal(t, 0, len(fast.send), "production frames must not enter the debug audience")
}

func TestOverlayDebugRunner_WhenNoDebugClientIsConnected_ExpectNoDelayedWork(t *testing.T) {
	// Arrange
	hub, err := NewHub(bus.New(0), nil, nil, nil)
	require.NoError(t, err)
	runner := newOverlayDebugRunner(hub)
	runner.wait = func(context.Context, time.Duration) bool {
		t.Fatal("a delayed step must not be scheduled without an accepting receiver")
		return false
	}

	// Act
	response, err := runner.fire(overlayDebugRequest{Scenario: debugScenarioRewardedMessage})

	// Assert
	require.NoError(t, err)
	require.Equal(t, "started", response.Status)
	require.NotEmpty(t, response.RunID)
	require.Zero(t, response.DeliveredClients)
}

func TestOverlayDebugScenarioFrames_WhenEveryScenarioIsSelected_ExpectExpectedEventOrder(t *testing.T) {
	// Arrange
	hub, err := NewHub(bus.New(0), nil, nil, nil)
	require.NoError(t, err)
	runner := newOverlayDebugRunner(hub)

	tests := []struct {
		scenario      overlayDebugScenario
		immediateType string
		delayedTypes  []string
	}{
		{debugScenarioMessage, wireMessageType, nil},
		{debugScenarioRewardedMessage, wireMessageType, []string{wireAlertType}},
		{debugScenarioCommandAlert, wireAlertType, nil},
		{debugScenarioLeaderboardUpdate, wireLeaderboardType, nil},
		{debugScenarioAlertBurst, wireAlertType, []string{wireAlertType, wireAlertType}},
	}

	for _, test := range tests {
		t.Run(string(test.scenario), func(t *testing.T) {
			// Act
			immediate, delayed, frameErr := runner.scenarioFrames(overlayDebugRequest{Scenario: test.scenario})

			// Assert
			require.NoError(t, frameErr)
			require.Len(t, immediate, 1)
			require.Equal(t, test.immediateType, frameType(t, immediate[0]))
			require.Len(t, delayed, len(test.delayedTypes))
			for index, expectedType := range test.delayedTypes {
				frame := decodeFrame(t, delayed[index].payload)
				require.Equal(t, expectedType, frame["type"])
				if test.scenario == debugScenarioAlertBurst {
					expectedSource := "award"
					if index == 1 {
						expectedSource = "command"
					}
					require.Equal(t, expectedSource, frame["source"])
				}
			}
		})
	}
}

func TestOverlayDebugScenarioFrames_WhenRewardedAndBurst_ExpectMatchingProductionEnvelopes(t *testing.T) {
	// Arrange
	hub, err := NewHub(bus.New(0), nil, nil, nil)
	require.NoError(t, err)
	runner := newOverlayDebugRunner(hub)
	points := 77
	request := overlayDebugRequest{
		Scenario:    debugScenarioRewardedMessage,
		DisplayName: "Nova",
		Message:     "quoted source text",
		Label:       "Cheer",
		Points:      &points,
	}

	// Act
	immediate, delayed, frameErr := runner.scenarioFrames(request)

	// Assert
	require.NoError(t, frameErr)
	require.Len(t, immediate, 1)
	message := decodeFrame(t, immediate[0])
	award := decodeFrame(t, delayed[0].payload)
	require.Equal(t, rewardedMessageWait, delayed[0].delay)
	require.Equal(t, wireMessageType, message["type"])
	require.Equal(t, debugPlatform, message["platform"])
	require.Equal(t, "Nova", message["display_name"])
	require.Equal(t, "quoted source text", message["message"])
	require.Equal(t, "award", award["source"])
	require.Equal(t, debugAwardSound, award["sound"])
	require.Equal(t, debugPlatform, award["message_platform"])
	require.Equal(t, message["id"], award["message_id"])
	require.Equal(t, message["message"], award["message_text"])
	require.Equal(t, float64(77), award["points"])

	commandImmediate, commandDelayed, commandErr := runner.scenarioFrames(overlayDebugRequest{Scenario: debugScenarioCommandAlert})
	require.NoError(t, commandErr)
	require.Empty(t, commandDelayed)
	command := decodeFrame(t, commandImmediate[0])
	require.Equal(t, "command", command["source"])
	require.Equal(t, debugCommandSound, command["sound"])

	burstAt := time.Date(2026, time.September, 2, 12, 0, 0, 123_000_000, time.UTC)
	runner.now = func() time.Time { return burstAt }
	burstImmediate, burstDelayed, burstErr := runner.scenarioFrames(overlayDebugRequest{Scenario: debugScenarioAlertBurst, Points: &points})
	require.NoError(t, burstErr)
	firstBurst := decodeFrame(t, burstImmediate[0])
	require.Equal(t, "command", firstBurst["source"])
	require.Equal(t, debugCommandSound, firstBurst["sound"])
	require.Equal(t, float64(alertBurstDuration), firstBurst["duration_ms"])
	require.Equal(t, burstAt.Format(time.RFC3339Nano), firstBurst["created_at"])
	require.Len(t, burstDelayed, 2)
	require.Equal(t, alertBurstWait, burstDelayed[0].delay)
	require.Equal(t, alertBurstWait, burstDelayed[1].delay)
	secondBurst := decodeFrame(t, burstDelayed[0].payload)
	require.Equal(t, "award", secondBurst["source"])
	require.Equal(t, debugAwardSound, secondBurst["sound"])
	require.Equal(t, float64(alertBurstDuration), secondBurst["duration_ms"])
	require.Equal(t, burstAt.Add(alertBurstWait).Format(time.RFC3339Nano), secondBurst["created_at"])
	thirdBurst := decodeFrame(t, burstDelayed[1].payload)
	require.Equal(t, "command", thirdBurst["source"])
	require.Equal(t, debugCommandSound, thirdBurst["sound"])
	require.Equal(t, float64(alertBurstDuration), thirdBurst["duration_ms"])
	require.Equal(t, burstAt.Add(2*alertBurstWait).Format(time.RFC3339Nano), thirdBurst["created_at"])
}

func TestOverlayDebugScenarioFrames_WhenLeaderboardIsOverridden_ExpectDeterministicThreeRows(t *testing.T) {
	// Arrange
	hub, err := NewHub(bus.New(0), nil, nil, nil)
	require.NoError(t, err)
	runner := newOverlayDebugRunner(hub)
	points := 321

	// Act
	immediate, delayed, frameErr := runner.scenarioFrames(overlayDebugRequest{
		Scenario:    debugScenarioLeaderboardUpdate,
		DisplayName: "Rank One",
		Points:      &points,
	})

	// Assert
	require.NoError(t, frameErr)
	require.Empty(t, delayed)
	frame := decodeFrame(t, immediate[0])
	require.Equal(t, "session", frame["period"])
	entries := frame["entries"].([]any)
	require.Len(t, entries, 3)
	require.Equal(t, map[string]any{"rank": float64(1), "display_name": "Rank One", "xp": float64(321), "message_count": float64(12)}, entries[0])
	require.Equal(t, map[string]any{"rank": float64(2), "display_name": "Overlay Pilot", "xp": float64(75), "message_count": float64(9)}, entries[1])
	require.Equal(t, map[string]any{"rank": float64(3), "display_name": "Chat Explorer", "xp": float64(50), "message_count": float64(6)}, entries[2])
}

func TestOverlayDebugRunner_WhenReplacementOrResetOccurs_ExpectDelayedFramesCancelled(t *testing.T) {
	// Arrange
	hub, err := NewHub(bus.New(0), nil, nil, nil)
	require.NoError(t, err)
	client := registerDebugTestClient(hub, ClientSendBuffer)
	runner := newOverlayDebugRunner(hub)
	release := make(chan struct{})
	started := make(chan struct{})
	runner.wait = func(ctx context.Context, _ time.Duration) bool {
		close(started)
		select {
		case <-ctx.Done():
			return false
		case <-release:
			return true
		}
	}

	// Act: replace a rewarded run before its award may send.
	_, err = runner.fire(overlayDebugRequest{Scenario: debugScenarioRewardedMessage})
	require.NoError(t, err)
	require.Equal(t, debugResetType, frameType(t, <-client.send))
	require.Equal(t, wireMessageType, frameType(t, <-client.send))
	<-started
	_, err = runner.fire(overlayDebugRequest{Scenario: debugScenarioMessage})
	require.NoError(t, err)
	require.Equal(t, debugResetType, frameType(t, <-client.send))
	require.Equal(t, wireMessageType, frameType(t, <-client.send))
	close(release)

	// Assert: the cancelled award cannot reappear after replacement.
	require.Never(t, func() bool { return len(client.send) > 0 }, 100*time.Millisecond, 5*time.Millisecond)

	// Act: Reset is clear-only and likewise cancels a pending run.
	resetHub, err := NewHub(bus.New(0), nil, nil, nil)
	require.NoError(t, err)
	resetClient := registerDebugTestClient(resetHub, ClientSendBuffer)
	resetRunner := newOverlayDebugRunner(resetHub)
	resetRelease := make(chan struct{})
	resetStarted := make(chan struct{})
	resetRunner.wait = func(ctx context.Context, _ time.Duration) bool {
		close(resetStarted)
		select {
		case <-ctx.Done():
			return false
		case <-resetRelease:
			return true
		}
	}
	_, err = resetRunner.fire(overlayDebugRequest{Scenario: debugScenarioRewardedMessage})
	require.NoError(t, err)
	<-resetClient.send
	<-resetClient.send
	<-resetStarted
	reset := resetRunner.reset()
	require.Equal(t, 1, reset.DeliveredClients)
	require.Equal(t, debugResetType, frameType(t, <-resetClient.send))
	close(resetRelease)

	// Assert
	require.Never(t, func() bool { return len(resetClient.send) > 0 }, 100*time.Millisecond, 5*time.Millisecond)
}

func TestOverlayDebugHub_WhenDebugClientConnects_ExpectCurrentSettingsOnly(t *testing.T) {
	// Arrange
	store := testConfigStore(t)
	hub, err := NewHub(bus.New(0), nil, store, nil)
	require.NoError(t, err)
	client := registerDebugTestClient(hub, ClientSendBuffer)

	// Act
	frame := decodeFrame(t, <-client.send)

	// Assert
	require.Equal(t, wireOverlaySettingsType, frame["type"])
	require.Equal(t, 1, hub.DebugClientCount())
	require.Equal(t, 0, hub.ClientCount())
}

func TestOverlayDebugRoutes_WhenProductionAndDebugSocketsConnect_ExpectBidirectionalIsolation(t *testing.T) {
	// Arrange
	env := newTestEnv(t, bus.New(0))
	server := httptest.NewServer(env.Handler)
	t.Cleanup(server.Close)
	baseWSURL := "ws" + strings.TrimPrefix(server.URL, "http")
	production, _, err := websocket.DefaultDialer.Dial(baseWSURL+"/ws", nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = production.Close() })
	debug, _, err := websocket.DefaultDialer.Dial(baseWSURL+"/ws/overlay-debug", nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = debug.Close() })

	// Assert: a dedicated connection gets the current appearance settings.
	settings := readWebSocketFrame(t, debug)
	require.Equal(t, wireOverlaySettingsType, settings["type"])

	// Act: run a synthetic scenario through the public action route.
	response, err := http.Post(server.URL+"/api/overlay-debug/scenario/fire", "application/json", strings.NewReader(`{"scenario":"message"}`))
	require.NoError(t, err)
	t.Cleanup(func() { _ = response.Body.Close() })
	require.Equal(t, http.StatusOK, response.StatusCode)
	var started map[string]any
	require.NoError(t, json.NewDecoder(response.Body).Decode(&started))
	require.Equal(t, map[string]any{"status": "started", "run_id": started["run_id"], "delivered_clients": float64(1)}, started)
	require.NotEmpty(t, started["run_id"])
	require.Equal(t, debugResetType, readWebSocketFrame(t, debug)["type"])
	require.Equal(t, wireMessageType, readWebSocketFrame(t, debug)["type"])

	// Act: reset, then publish production chat through the shared bus.
	resetResponse, err := http.Post(server.URL+"/api/overlay-debug/session/reset", "application/json", strings.NewReader(`{}`))
	require.NoError(t, err)
	t.Cleanup(func() { _ = resetResponse.Body.Close() })
	require.Equal(t, http.StatusOK, resetResponse.StatusCode)
	var reset map[string]any
	require.NoError(t, json.NewDecoder(resetResponse.Body).Decode(&reset))
	require.Equal(t, map[string]any{"status": "reset", "delivered_clients": float64(1)}, reset)
	require.Equal(t, debugResetType, readWebSocketFrame(t, debug)["type"])

	require.NoError(t, env.Bus.Publish(bus.ChatMessageReceived(bus.ChatMessage{
		ID: "live-1", Platform: "twitch", Username: "Live", Message: "production only",
	})))
	productionFrame := readWebSocketFrameSkippingLeaderboard(t, production)
	require.Equal(t, wireMessageType, productionFrame["type"])
	require.Equal(t, "live-1", productionFrame["id"])
	assertNoWebSocketFrame(t, debug)
}

func TestOverlayDebugRoutes_WhenScenarioAndResetAreCalled_ExpectNoProductStateMutation(t *testing.T) {
	// Arrange
	env := newTestEnv(t, bus.New(0))
	viewerID := seedViewer(t, env, "twitch", "42", "Alice")
	configBefore, err := os.ReadFile(env.ConfigStore.Path())
	require.NoError(t, err)
	viewerBefore := getViewerResponse(t, env.Handler, viewerID)
	eventsBefore, err := env.ViewerStore.ListInteractionEventsByViewer(viewerID)
	require.NoError(t, err)

	// Act
	for _, request := range []*http.Request{
		httptest.NewRequest(http.MethodPost, "/api/overlay-debug/scenario/fire", strings.NewReader(`{"scenario":"alert_burst","display_name":"Synthetic","points":1000}`)),
		httptest.NewRequest(http.MethodPost, "/api/overlay-debug/session/reset", strings.NewReader(`{}`)),
	} {
		rec := httptest.NewRecorder()
		env.Handler.ServeHTTP(rec, request)
		require.Equal(t, http.StatusOK, rec.Code)
	}

	// Assert: the routed handler only owns an in-memory runner and Hub.
	configAfter, err := os.ReadFile(env.ConfigStore.Path())
	require.NoError(t, err)
	viewerAfter := getViewerResponse(t, env.Handler, viewerID)
	eventsAfter, err := env.ViewerStore.ListInteractionEventsByViewer(viewerID)
	require.NoError(t, err)
	require.Equal(t, configBefore, configAfter)
	require.Equal(t, viewerBefore, viewerAfter)
	require.Equal(t, eventsBefore, eventsAfter)
}

func TestOverlayDebugRunner_WhenConcurrentFire_ExpectOneGlobalGeneration(t *testing.T) {
	// Arrange
	hub, err := NewHub(bus.New(0), nil, nil, nil)
	require.NoError(t, err)
	client := registerDebugTestClient(hub, ClientSendBuffer)
	runner := newOverlayDebugRunner(hub)

	// Act
	var wg sync.WaitGroup
	for range 2 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, fireErr := runner.fire(overlayDebugRequest{Scenario: debugScenarioMessage})
			require.NoError(t, fireErr)
		}()
	}
	wg.Wait()

	// Assert
	require.Equal(t, 4, len(client.send))
	for range 2 {
		require.Equal(t, debugResetType, frameType(t, <-client.send))
		require.Equal(t, wireMessageType, frameType(t, <-client.send))
	}
}

func registerDebugTestClient(hub *Hub, capacity int) *wsClient {
	client := &wsClient{hub: hub, debug: true, send: make(chan []byte, capacity)}
	hub.register(client)
	return client
}

func decodeFrame(t *testing.T, payload []byte) map[string]any {
	t.Helper()
	var frame map[string]any
	require.NoError(t, json.Unmarshal(payload, &frame))
	return frame
}

func frameType(t *testing.T, payload []byte) string {
	t.Helper()
	frame := decodeFrame(t, payload)
	typeName, ok := frame["type"].(string)
	require.True(t, ok)
	return typeName
}

func readWebSocketFrame(t *testing.T, conn *websocket.Conn) map[string]any {
	t.Helper()
	require.NoError(t, conn.SetReadDeadline(time.Now().Add(time.Second)))
	_, payload, err := conn.ReadMessage()
	require.NoError(t, err)
	return decodeFrame(t, payload)
}

func readWebSocketFrameSkippingLeaderboard(t *testing.T, conn *websocket.Conn) map[string]any {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		_ = conn.SetReadDeadline(time.Now().Add(200 * time.Millisecond))
		_, payload, err := conn.ReadMessage()
		if err != nil {
			continue
		}
		frame := decodeFrame(t, payload)
		if frame["type"] == wireLeaderboardType || frame["type"] == wireLeaderboardVisibilityType {
			continue
		}
		return frame
	}
	t.Fatal("timed out waiting for non-leaderboard frame")
	return nil
}

func assertNoWebSocketFrame(t *testing.T, conn *websocket.Conn) {
	t.Helper()
	require.NoError(t, conn.SetReadDeadline(time.Now().Add(100*time.Millisecond)))
	_, _, err := conn.ReadMessage()
	require.Error(t, err)
	require.NoError(t, conn.SetReadDeadline(time.Time{}))
}

func getViewerResponse(t *testing.T, handler http.Handler, viewerID string) map[string]any {
	t.Helper()
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/viewers/get?id="+viewerID, nil))
	require.Equal(t, http.StatusOK, rec.Code)
	var viewer map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &viewer))
	return viewer
}
