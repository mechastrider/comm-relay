package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
)

func TestViewerStatus_WhenKnownAndUnknownIdentity_ExpectBoundedReadOnlySnapshot(t *testing.T) {
	// Arrange.
	env := newTestEnv(t, bus.New(0))
	id := seedViewer(t, env, "twitch", "visual", "Visual")
	rec := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/viewers/status", strings.NewReader(`{"identities":[{"platform":"twitch","user_id":"visual"},{"platform":"twitch","user_id":"unknown"}]}`))

	// Act.
	env.Handler.ServeHTTP(rec, request)

	// Assert.
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	var response struct {
		Statuses []viewerVisualStatusResponse `json:"statuses"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
	require.Len(t, response.Statuses, 1)
	require.Equal(t, id, response.Statuses[0].ViewerID)
	require.Equal(t, "visual", response.Statuses[0].UserID)
	require.NotEmpty(t, response.Statuses[0].SessionID)
	require.Equal(t, "chevron_1", response.Statuses[0].Level.Emblem)
	require.Equal(t, 1, response.Statuses[0].Like.Remaining)
	require.Equal(t, "no-store", rec.Header().Get("Cache-Control"))
	_, exists := env.ViewerStore.ViewerIDForIdentity("twitch", "unknown")
	require.False(t, exists)
}
