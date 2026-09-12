package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
)

func TestProgressionRoutes_WhenCatalogAndViewerRequested_ExpectSnakeCaseAndSecretFiltering(t *testing.T) {
	// Arrange
	env := newTestEnv(t, bus.New(0))
	viewerID := seedViewer(t, env, "twitch", "progression-route", "Progression route")
	create := httptest.NewRequest(http.MethodPost, "/api/progression/achievements/create", strings.NewReader(`{"id":"secret_route","name":"Secret route","enabled":true,"secret":true,"announce":true,"metric":"message_count","target":2}`))
	createRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(createRec, create)
	require.Equal(t, http.StatusOK, createRec.Code, createRec.Body.String())

	// Act
	levelsRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(levelsRec, httptest.NewRequest(http.MethodGet, "/api/progression/levels", nil))
	viewerRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(viewerRec, httptest.NewRequest(http.MethodGet, "/api/progression/viewer?id="+viewerID, nil))
	viewerDetailRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(viewerDetailRec, httptest.NewRequest(http.MethodGet, "/api/viewers/get?id="+viewerID, nil))
	viewerListRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(viewerListRec, httptest.NewRequest(http.MethodGet, "/api/viewers", nil))

	// Assert
	require.Equal(t, http.StatusOK, levelsRec.Code)
	assert.Contains(t, levelsRec.Body.String(), `"min_xp"`)
	require.Equal(t, http.StatusOK, viewerRec.Code)
	var payload struct {
		ViewerID     string `json:"viewer_id"`
		Achievements []struct {
			Achievement struct {
				ID string `json:"id"`
			} `json:"achievement"`
		} `json:"achievements"`
	}
	require.NoError(t, json.Unmarshal(viewerRec.Body.Bytes(), &payload))
	assert.Equal(t, viewerID, payload.ViewerID)
	for _, item := range payload.Achievements {
		assert.NotEqual(t, "secret_route", item.Achievement.ID)
	}
	require.Equal(t, http.StatusOK, viewerDetailRec.Code, viewerDetailRec.Body.String())
	assert.Contains(t, viewerDetailRec.Body.String(), `"progression"`)
	assert.Contains(t, viewerDetailRec.Body.String(), `"current_level"`)
	assert.NotContains(t, viewerDetailRec.Body.String(), "secret_route")
	require.Equal(t, http.StatusOK, viewerListRec.Code, viewerListRec.Body.String())
	assert.Contains(t, viewerListRec.Body.String(), `"current_level"`)
}

func TestProgressionRoutes_WhenInvalidActionInput_ExpectAtomicBadRequest(t *testing.T) {
	// Arrange
	handler := testHandler(t)

	// Act
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/progression/levels/create", strings.NewReader(`{"title":"","min_xp":-1}`)))

	// Assert
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), `"error"`)
}

func TestProgressionRoutes_WhenSettingsAndStatusReadOrUpdated_ExpectSnakeCaseWireDTOs(t *testing.T) {
	// Arrange
	env := newTestEnv(t, bus.New(0))

	// Act
	settingsRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(settingsRec, httptest.NewRequest(http.MethodGet, "/api/progression/settings", nil))
	statusRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(statusRec, httptest.NewRequest(http.MethodGet, "/api/progression/status", nil))
	updateRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(updateRec, httptest.NewRequest(http.MethodPost, "/api/progression/settings/update", strings.NewReader(`{"achievement_enabled":true,"level_enabled":false,"layout":"card","sound":"","sound_volume":70,"duration_ms":5000}`)))
	reconcileRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(reconcileRec, httptest.NewRequest(http.MethodPost, "/api/progression/reconcile", strings.NewReader(`{}`)))

	// Assert
	for _, rec := range []*httptest.ResponseRecorder{settingsRec, statusRec, updateRec, reconcileRec} {
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	}
	assert.Contains(t, settingsRec.Body.String(), `"achievement_enabled":false`)
	assert.Contains(t, settingsRec.Body.String(), `"level_enabled":false`)
	assert.NotContains(t, settingsRec.Body.String(), `"AchievementEnabled"`)
	assert.Contains(t, updateRec.Body.String(), `"achievement_enabled":true`)
	assert.NotContains(t, updateRec.Body.String(), `"AchievementEnabled"`)
	assert.Regexp(t, `"state":"(idle|pending|running)"`, statusRec.Body.String())
	assert.Contains(t, statusRec.Body.String(), `"requested_generation"`)
	assert.NotContains(t, statusRec.Body.String(), `"Status"`)
	assert.Contains(t, reconcileRec.Body.String(), `"state":"pending"`)
}

func TestViewerUpdate_WhenProgressionAlertExclusionSet_ExpectPersistedFlag(t *testing.T) {
	// Arrange
	env := newTestEnv(t, bus.New(0))
	viewerID := seedViewer(t, env, "twitch", "progression-exclusion", "Exclusion")

	// Act
	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/viewers/update", strings.NewReader(`{"id":"`+viewerID+`","progression_alerts_disabled":true}`)))
	getRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(getRec, httptest.NewRequest(http.MethodGet, "/api/viewers/get?id="+viewerID, nil))

	// Assert
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	require.Equal(t, http.StatusOK, getRec.Code, getRec.Body.String())
	assert.Contains(t, getRec.Body.String(), `"progression_alerts_disabled":true`)
}

func TestProgressionPreview_WhenDraftPosted_ExpectDebugOnlyNoPersistence(t *testing.T) {
	// Arrange
	env := newTestEnv(t, bus.New(0))
	debug := &wsClient{hub: env.Hub, debug: true, send: make(chan []byte, 4)}
	production := &wsClient{hub: env.Hub, send: make(chan []byte, 4)}
	env.Hub.register(debug)
	env.Hub.register(production)
	select {
	case <-debug.send:
	default:
	}
	for len(production.send) > 0 {
		<-production.send
	}
	before, err := env.ViewerStore.ListAchievements()
	require.NoError(t, err)

	// Act
	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/progression/preview", strings.NewReader(`{"kind":"achievement","name":"Unsaved test","description":"Only debug"}`)))

	// Assert
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	select {
	case frame := <-debug.send:
		assert.Contains(t, string(frame), `"type":"viewer_progression"`)
	default:
		t.Fatal("expected debug progression frame")
	}
	select {
	case frame := <-production.send:
		t.Fatalf("unexpected production frame: %s", frame)
	default:
	}
	after, err := env.ViewerStore.ListAchievements()
	require.NoError(t, err)
	assert.Len(t, after, len(before))
}
