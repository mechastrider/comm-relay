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

func TestCommands_WhenFreshMigrate_ExpectSeedsInList(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/commands", nil))
	require.Equal(t, http.StatusOK, rec.Code)

	var payload struct {
		Commands []struct {
			ID      string `json:"id"`
			Trigger string `json:"trigger"`
		} `json:"commands"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Len(t, payload.Commands, 2)

	triggers := map[string]bool{}
	for _, cmd := range payload.Commands {
		triggers[cmd.Trigger] = true
	}
	require.True(t, triggers["gg"])
	require.True(t, triggers["hi"])

	awardsRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(awardsRec, httptest.NewRequest(http.MethodGet, "/api/awards", nil))
	require.Equal(t, http.StatusOK, awardsRec.Code)

	var awardsPayload struct {
		Awards []struct {
			ID string `json:"id"`
		} `json:"awards"`
	}
	require.NoError(t, json.Unmarshal(awardsRec.Body.Bytes(), &awardsPayload))
	require.Len(t, awardsPayload.Awards, 8)

	ids := map[string]bool{}
	for _, award := range awardsPayload.Awards {
		ids[award.ID] = true
	}
	require.True(t, ids["joke"])
	require.True(t, ids["advice"])
	require.True(t, ids["spotter"])
	require.True(t, ids["intel"])
	require.True(t, ids["expert"])
	require.True(t, ids["meme"])
	require.True(t, ids["clutch"])
	require.True(t, ids["mvp"])
}

func TestCommands_WhenCreateLurk_ExpectListed(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	createRec := httptest.NewRecorder()
	body := `{"trigger":"lurk","enabled":true,"cooldown_seconds":10,"splash_template":"lurking","sound":"","duration_ms":5000}`
	req := httptest.NewRequest(http.MethodPost, "/api/commands/create", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(createRec, req)
	require.Equal(t, http.StatusOK, createRec.Code)

	listRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(listRec, httptest.NewRequest(http.MethodGet, "/api/commands", nil))
	require.Equal(t, http.StatusOK, listRec.Code)
	require.Contains(t, listRec.Body.String(), `"trigger":"lurk"`)
}

func TestCommands_WhenDuplicateTrigger_ExpectFieldError(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	rec := httptest.NewRecorder()
	body := `{"trigger":"gg","enabled":true,"cooldown_seconds":0,"splash_template":"dup","sound":"","duration_ms":5000}`
	req := httptest.NewRequest(http.MethodPost, "/api/commands/create", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusBadRequest, rec.Code)

	var payload struct {
		Fields map[string]string `json:"fields"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Equal(t, "trigger already exists", payload.Fields["trigger"])
}

func TestCommands_WhenDeleteGg_ExpectMissingFromList(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	deleteRec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/commands/delete", strings.NewReader(`{"id":"gg"}`))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(deleteRec, req)
	require.Equal(t, http.StatusOK, deleteRec.Code)

	listRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(listRec, httptest.NewRequest(http.MethodGet, "/api/commands", nil))
	require.Equal(t, http.StatusOK, listRec.Code)
	require.NotContains(t, listRec.Body.String(), `"trigger":"gg"`)
}

func TestCommands_WhenInvalidTrigger_ExpectFieldError(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	rec := httptest.NewRecorder()
	body := `{"trigger":"!gg","enabled":true,"cooldown_seconds":0,"splash_template":"bad","sound":"","duration_ms":5000}`
	req := httptest.NewRequest(http.MethodPost, "/api/commands/create", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusBadRequest, rec.Code)

	var payload struct {
		Fields map[string]string `json:"fields"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Equal(t, "invalid trigger", payload.Fields["trigger"])
}

func TestCommands_WhenMediaNumbersOutOfRange_ExpectFieldErrors(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	rec := httptest.NewRecorder()
	body := `{"trigger":"badmedia","enabled":true,"cooldown_seconds":0,"splash_template":"bad","sound":"","duration_ms":5000,"sound_volume":101,"image_size_pct":301}`
	req := httptest.NewRequest(http.MethodPost, "/api/commands/create", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusBadRequest, rec.Code)

	var payload struct {
		Fields map[string]string `json:"fields"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Equal(t, "volume must be between 0 and 100", payload.Fields["sound_volume"])
	require.Equal(t, "image size must be between 25% and 300%", payload.Fields["image_size_pct"])
}

func TestAwards_WhenCreateClutch_ExpectListed(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	createRec := httptest.NewRecorder()
	body := `{"name":"Clutch","points":25,"splash_template":"Clutch {viewer} +{points}","sound":"alert","duration_ms":5000}`
	req := httptest.NewRequest(http.MethodPost, "/api/awards/create", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(createRec, req)
	require.Equal(t, http.StatusOK, createRec.Code)

	listRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(listRec, httptest.NewRequest(http.MethodGet, "/api/awards", nil))
	require.Equal(t, http.StatusOK, listRec.Code)
	require.Contains(t, listRec.Body.String(), `"name":"Clutch"`)
	require.Contains(t, listRec.Body.String(), `"points":25`)
}

func TestAwards_WhenDeleteJoke_ExpectMissingFromList(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	deleteRec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/awards/delete", strings.NewReader(`{"id":"joke"}`))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(deleteRec, req)
	require.Equal(t, http.StatusOK, deleteRec.Code)

	listRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(listRec, httptest.NewRequest(http.MethodGet, "/api/awards", nil))
	require.Equal(t, http.StatusOK, listRec.Code)
	require.NotContains(t, listRec.Body.String(), `"id":"joke"`)
}

func TestAwards_WhenInvalidPoints_ExpectFieldError(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	rec := httptest.NewRecorder()
	body := `{"name":"Bad","points":0,"splash_template":"nope","sound":"","duration_ms":5000}`
	req := httptest.NewRequest(http.MethodPost, "/api/awards/create", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusBadRequest, rec.Code)

	var payload struct {
		Fields map[string]string `json:"fields"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Equal(t, "points must be at least 1", payload.Fields["points"])
}

func TestAwards_WhenMediaNumbersOutOfRange_ExpectFieldErrors(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	rec := httptest.NewRecorder()
	body := `{"name":"Bad media","points":10,"splash_template":"bad","sound":"","duration_ms":5000,"sound_volume":-1,"image_size_pct":24}`
	req := httptest.NewRequest(http.MethodPost, "/api/awards/create", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusBadRequest, rec.Code)

	var payload struct {
		Fields map[string]string `json:"fields"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Equal(t, "volume must be between 0 and 100", payload.Fields["sound_volume"])
	require.Equal(t, "image size must be between 25% and 300%", payload.Fields["image_size_pct"])
}
