package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestConfig_WhenCommandAudioUpdateOmitted_ExpectSavedValuePreserved(t *testing.T) {
	t.Parallel()
	// Arrange
	handler := testHandler(t)
	get := httptest.NewRecorder()
	handler.ServeHTTP(get, httptest.NewRequest(http.MethodGet, "/api/config", nil))
	require.Equal(t, http.StatusOK, get.Code)
	var payload map[string]any
	require.NoError(t, json.Unmarshal(get.Body.Bytes(), &payload))
	admin := payload["admin"].(map[string]any)
	require.Equal(t, true, admin["command_sound_enabled"])
	admin["command_sound_enabled"] = false
	for _, omit := range []bool{false, true} {
		if omit {
			delete(admin, "command_sound_enabled")
		}
		body, err := json.Marshal(payload)
		require.NoError(t, err)
		// Act
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/api/config/update", strings.NewReader(string(body)))
		req.Header.Set("Content-Type", "application/json")
		handler.ServeHTTP(rec, req)
		// Assert
		require.Equal(t, http.StatusOK, rec.Code)
		var saved map[string]any
		require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &saved))
		require.Equal(t, false, saved["admin"].(map[string]any)["command_sound_enabled"])
	}
}
