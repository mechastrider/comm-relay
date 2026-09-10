package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/leaderboard"
	"github.com/mechastrider/comm-relay/internal/store"
)

func TestLeaderboardVisibilityRoutes_WhenActionsSucceed_ExpectAuthoritativeSnapshots(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	get := httptest.NewRecorder()
	env.Handler.ServeHTTP(get, httptest.NewRequest(http.MethodGet, "/api/leaderboard/visibility", nil))
	require.Equal(t, http.StatusOK, get.Code)
	require.Contains(t, get.Body.String(), `"state":"hidden"`)
	require.Contains(t, get.Body.String(), `"policy":"automatic"`)

	show := performVisibilityAction(t, env.Handler, "/api/leaderboard/show", `{}`)
	require.Equal(t, leaderboard.StateTimed, show.State)
	require.Equal(t, leaderboard.ReasonManual, show.Reason)
	require.NotNil(t, show.VisibleUntil)

	pin := performVisibilityAction(t, env.Handler, "/api/leaderboard/pin", `{}`)
	require.Equal(t, leaderboard.StatePinned, pin.State)

	hide := performVisibilityAction(t, env.Handler, "/api/leaderboard/hide", `{}`)
	require.Equal(t, leaderboard.StateHidden, hide.State)

	resume := performVisibilityAction(t, env.Handler, "/api/leaderboard/resume", `{}`)
	require.Equal(t, leaderboard.StateHidden, resume.State)
	require.Equal(t, leaderboard.ReasonPolicy, resume.Reason)
}

func TestConfigUpdate_WhenVisibilityPolicyChanges_ExpectImmediateRuntimeReevaluation(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	cfg := env.ConfigStore.Snapshot()
	cfg.LeaderboardVisibility.Policy = config.LeaderboardVisibilityPolicyAlways
	body, err := json.Marshal(cfg.Public())
	require.NoError(t, err)

	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/config/update", strings.NewReader(string(body))))
	require.Equal(t, http.StatusOK, rec.Code)

	snapshot, err := env.Visibility.Snapshot(context.Background())
	require.NoError(t, err)
	require.Equal(t, leaderboard.StatePinned, snapshot.State)
	require.Equal(t, leaderboard.ReasonPolicy, snapshot.Reason)
}

func TestConfigUpdate_WhenVisibilityObjectOmitted_ExpectStoredPolicyPreserved(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	require.NoError(t, env.ConfigStore.Mutate(func(cfg *config.Config) error {
		cfg.LeaderboardVisibility.Policy = config.LeaderboardVisibilityPolicyAlways
		return nil
	}))

	document, err := json.Marshal(env.ConfigStore.Snapshot().Public())
	require.NoError(t, err)
	var payload map[string]any
	require.NoError(t, json.Unmarshal(document, &payload))
	delete(payload, "leaderboard_visibility")
	body, err := json.Marshal(payload)
	require.NoError(t, err)

	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/config/update", strings.NewReader(string(body))))
	require.Equal(t, http.StatusOK, rec.Code)
	require.Equal(t, config.LeaderboardVisibilityPolicyAlways, env.ConfigStore.Snapshot().LeaderboardVisibility.Policy)
}

func TestConfigUpdate_WhenLoggingObjectOmitted_ExpectStoredLoggingPreserved(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	disabled := false
	require.NoError(t, env.ConfigStore.Mutate(func(cfg *config.Config) error {
		cfg.Logging.Enabled = &disabled
		cfg.Logging.RetainSessions = 12
		return nil
	}))

	document, err := json.Marshal(env.ConfigStore.Snapshot().Public())
	require.NoError(t, err)
	var payload map[string]any
	require.NoError(t, json.Unmarshal(document, &payload))
	delete(payload, "logging")
	body, err := json.Marshal(payload)
	require.NoError(t, err)

	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/config/update", strings.NewReader(string(body))))
	require.Equal(t, http.StatusOK, rec.Code)

	saved := env.ConfigStore.Snapshot().Logging
	require.NotNil(t, saved.Enabled)
	require.False(t, *saved.Enabled)
	require.Equal(t, 12, saved.RetainSessions)
}

func TestLeaderboardVisibilityShow_WhenDurationOutOfRange_ExpectBadRequestAndNoMutation(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	before, err := env.Visibility.Snapshot(context.Background())
	require.NoError(t, err)

	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(
		http.MethodPost,
		"/api/leaderboard/show",
		strings.NewReader(`{"duration_seconds":120}`),
	))
	require.Equal(t, http.StatusBadRequest, rec.Code)
	after, err := env.Visibility.Snapshot(context.Background())
	require.NoError(t, err)
	require.Equal(t, before, after)
}

func TestLeaderboardVisibilityAction_WhenMalformedOrUnknownJSON_ExpectBadRequest(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	for _, body := range []string{`{`, `{"unexpected":true}`, `{} {}`} {
		rec := httptest.NewRecorder()
		env.Handler.ServeHTTP(rec, httptest.NewRequest(
			http.MethodPost,
			"/api/leaderboard/show",
			strings.NewReader(body),
		))
		require.Equal(t, http.StatusBadRequest, rec.Code)
	}
}

func TestLeaderboardVisibilityHandler_WhenControllerUnavailable_ExpectServiceUnavailable(t *testing.T) {
	handler := &leaderboardVisibilityHandler{}
	for _, action := range []func(http.ResponseWriter, *http.Request){handler.handleGet, handler.handleShow} {
		rec := httptest.NewRecorder()
		action(rec, httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{}`)))
		require.Equal(t, http.StatusServiceUnavailable, rec.Code)
		require.NotContains(t, rec.Body.String(), "controller")
	}
}

func TestLeaderboardVisibilityActions_WhenContractActive_ExpectVisibilityChangeWithoutContentChange(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	contractID := openViewerContractForTest(t, env, "Find loot", "Mark it")
	display := httptest.NewRecorder()
	env.Handler.ServeHTTP(display, httptest.NewRequest(
		http.MethodPost,
		"/api/viewer-contracts/display",
		strings.NewReader(`{"id":"`+contractID+`","content":"leaderboard","visible":true}`),
	))
	require.Equal(t, http.StatusOK, display.Code)

	hide := httptest.NewRecorder()
	env.Handler.ServeHTTP(hide, httptest.NewRequest(http.MethodPost, "/api/leaderboard/hide", strings.NewReader(`{}`)))
	require.Equal(t, http.StatusOK, hide.Code)
	snapshot := currentContractPresentationForTest(t, env)
	require.Equal(t, contractContentLeaderboard, snapshot.Content)
	require.False(t, snapshot.Visible)

	show := httptest.NewRecorder()
	env.Handler.ServeHTTP(show, httptest.NewRequest(http.MethodPost, "/api/leaderboard/show", strings.NewReader(`{}`)))
	require.Equal(t, http.StatusOK, show.Code)
	snapshot = currentContractPresentationForTest(t, env)
	require.Equal(t, contractContentLeaderboard, snapshot.Content)
	require.True(t, snapshot.Visible)
}

func TestHub_WhenTimedDisplayExpires_ExpectSelectedContentHidden(t *testing.T) {
	hub, err := NewHub(bus.New(0), nil, nil, nil)
	require.NoError(t, err)
	presentation, err := newViewerContractPresentation(nil)
	require.NoError(t, err)
	presentation.Activate(&store.ViewerContract{ID: "contract-1"})
	_, ok := presentation.Update("contract-1", contractContentLeaderboard, true)
	require.True(t, ok)
	hub.SetViewerContractPresentation(presentation)

	hub.handleLeaderboardVisibility(context.Background(), leaderboard.Snapshot{State: leaderboard.StateHidden})

	snapshot := presentation.Current()
	require.Equal(t, contractContentLeaderboard, snapshot.Content)
	require.False(t, snapshot.Visible)
}

func TestHub_WhenLeaderboardStartsPinned_ExpectRecoveredContractVisible(t *testing.T) {
	hub, err := NewHub(bus.New(0), nil, nil, nil)
	require.NoError(t, err)
	presentation, err := newViewerContractPresentation(nil)
	require.NoError(t, err)
	presentation.Activate(&store.ViewerContract{ID: "contract-1"})
	hub.SetViewerContractPresentation(presentation)

	hub.handleLeaderboardVisibility(context.Background(), leaderboard.Snapshot{
		State: leaderboard.StatePinned, Reason: leaderboard.ReasonStartup, Visible: true,
	})

	require.True(t, presentation.Current().Visible)
}

func TestViewerContractLifecycle_WhenOpenedAndClosed_ExpectSharedVisibilityPinnedThenRestored(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	contractID := openViewerContractForTest(t, env, "Find loot", "Mark it")

	pinned, err := env.Visibility.Snapshot(context.Background())
	require.NoError(t, err)
	require.Equal(t, leaderboard.StatePinned, pinned.State)

	closed := httptest.NewRecorder()
	env.Handler.ServeHTTP(closed, httptest.NewRequest(
		http.MethodPost,
		"/api/viewer-contracts/close",
		strings.NewReader(`{"id":"`+contractID+`"}`),
	))
	require.Equal(t, http.StatusOK, closed.Code)

	restored, err := env.Visibility.Snapshot(context.Background())
	require.NoError(t, err)
	require.Equal(t, leaderboard.StateHidden, restored.State)
	require.Equal(t, leaderboard.ReasonPolicy, restored.Reason)
}

func currentContractPresentationForTest(t *testing.T, env testEnv) currentViewerContractResponse {
	t.Helper()
	recorder := httptest.NewRecorder()
	env.Handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/api/viewer-contracts/current", nil))
	require.Equal(t, http.StatusOK, recorder.Code)
	var payload currentViewerContractResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	return payload
}

func TestHub_WhenProductionClientsRegisterAndTransition_ExpectSnapshotAndBoundedBroadcast(t *testing.T) {
	cfg := *config.Default()
	provider := &staticConfigProvider{cfg: cfg}
	hub, err := NewHub(bus.New(0), nil, nil, nil)
	require.NoError(t, err)
	controller, err := leaderboard.NewController(provider, func(snapshot leaderboard.Snapshot) {
		hub.handleLeaderboardVisibility(context.Background(), snapshot)
	})
	require.NoError(t, err)
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- controller.Run(ctx) }()
	t.Cleanup(func() {
		cancel()
		require.NoError(t, <-done)
	})
	require.Eventually(t, func() bool {
		_, snapshotErr := controller.Snapshot(context.Background())
		return snapshotErr == nil
	}, time.Second, time.Millisecond)
	hub.SetLeaderboardVisibility(controller)
	presentation, err := newViewerContractPresentation(nil)
	require.NoError(t, err)
	hub.SetViewerContractPresentation(presentation)
	first := &wsClient{hub: hub, send: make(chan []byte, ClientSendBuffer)}
	second := &wsClient{hub: hub, send: make(chan []byte, ClientSendBuffer)}
	debug := &wsClient{hub: hub, send: make(chan []byte, ClientSendBuffer), debug: true}

	hub.register(first)
	hub.register(second)
	hub.register(debug)
	for _, client := range []*wsClient{first, second} {
		frame := decodeVisibilityFrame(t, <-client.send)
		require.Equal(t, "leaderboard_visibility", frame["type"])
		require.Equal(t, "hidden", frame["state"])
		contractFrame := decodeVisibilityFrame(t, <-client.send)
		require.Equal(t, wireViewerContractStateType, contractFrame["type"])
		require.Nil(t, contractFrame["contract"])
	}
	select {
	case payload := <-debug.send:
		t.Fatalf("debug client received production visibility frame: %s", payload)
	default:
	}

	_, err = controller.Pin(context.Background())
	require.NoError(t, err)
	for _, client := range []*wsClient{first, second} {
		frame := decodeVisibilityFrame(t, <-client.send)
		require.Equal(t, "pinned", frame["state"])
	}

	hub.unregister(first)
	reconnected := &wsClient{hub: hub, send: make(chan []byte, ClientSendBuffer)}
	hub.register(reconnected)
	frame := decodeVisibilityFrame(t, <-reconnected.send)
	require.Equal(t, "pinned", frame["state"])
	require.Equal(t, wireViewerContractStateType, decodeVisibilityFrame(t, <-reconnected.send)["type"])
}

type staticConfigProvider struct{ cfg config.Config }

func (p *staticConfigProvider) Snapshot() config.Config { return p.cfg }

func performVisibilityAction(t *testing.T, handler http.Handler, path, body string) leaderboard.Snapshot {
	t.Helper()
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, path, strings.NewReader(body)))
	require.Equal(t, http.StatusOK, rec.Code)
	var result leaderboard.Snapshot
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &result))
	return result
}

func decodeVisibilityFrame(t *testing.T, payload []byte) map[string]any {
	t.Helper()
	var frame map[string]any
	require.NoError(t, json.Unmarshal(payload, &frame))
	return frame
}

func TestLeaderboardVisibilityCurrent_WhenTimed_ExpectAbsoluteRFC3339Deadline(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	shown := performVisibilityAction(t, env.Handler, "/api/leaderboard/show", `{"duration_seconds":5}`)
	require.WithinDuration(t, time.Now().Add(5*time.Second), *shown.VisibleUntil, time.Second)
}
