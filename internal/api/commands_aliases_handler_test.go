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

func TestCommands_WhenListSeeds_ExpectEmptyAliasesArray(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/commands", nil))
	require.Equal(t, http.StatusOK, rec.Code)

	var payload struct {
		Commands []struct {
			Trigger string   `json:"trigger"`
			Aliases []string `json:"aliases"`
		} `json:"commands"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Len(t, payload.Commands, 4)
	for _, cmd := range payload.Commands {
		require.NotNil(t, cmd.Aliases)
		require.Empty(t, cmd.Aliases)
	}
}

func TestCommands_WhenCreateWithAliases_ExpectListed(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	body := `{"trigger":"heat","aliases":["warm"],"enabled":true,"cooldown_seconds":0,"splash_template":"hot","sound":"","duration_ms":5000}`
	createRec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/commands/create", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(createRec, req)
	require.Equal(t, http.StatusOK, createRec.Code)
	require.Contains(t, createRec.Body.String(), `"aliases":["warm"]`)

	listRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(listRec, httptest.NewRequest(http.MethodGet, "/api/commands", nil))
	require.Equal(t, http.StatusOK, listRec.Code)
	require.Contains(t, listRec.Body.String(), `"aliases":["warm"]`)
}

func TestCommands_WhenUpdateReplacesAliases_ExpectNewSet(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	createBody := `{"trigger":"alpha","aliases":["a"],"enabled":true,"cooldown_seconds":0,"splash_template":"x","sound":"","duration_ms":5000}`
	createRec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/commands/create", strings.NewReader(createBody))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(createRec, req)
	require.Equal(t, http.StatusOK, createRec.Code)

	var created struct {
		ID string `json:"id"`
	}
	require.NoError(t, json.Unmarshal(createRec.Body.Bytes(), &created))

	updateBody := `{"id":"` + created.ID + `","trigger":"alpha","aliases":["alt"],"enabled":true,"cooldown_seconds":0,"splash_template":"x","sound":"","duration_ms":5000}`
	updateRec := httptest.NewRecorder()
	updateReq := httptest.NewRequest(http.MethodPost, "/api/commands/update", strings.NewReader(updateBody))
	updateReq.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(updateRec, updateReq)
	require.Equal(t, http.StatusOK, updateRec.Code)
	require.Contains(t, updateRec.Body.String(), `"aliases":["alt"]`)
}

func TestCommands_WhenInvalidAlias_ExpectFieldError(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	body := `{"trigger":"bad","aliases":["!nope"],"enabled":true,"cooldown_seconds":0,"splash_template":"x","sound":"","duration_ms":5000}`
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/commands/create", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusBadRequest, rec.Code)

	var payload struct {
		Fields map[string]string `json:"fields"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Equal(t, "invalid alias", payload.Fields["aliases"])
}

func TestCommands_WhenTriggerCollidesWithAlias_ExpectTriggerFieldError(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	first := `{"trigger":"owner","aliases":["claimed"],"enabled":true,"cooldown_seconds":0,"splash_template":"x","sound":"","duration_ms":5000}`
	req := httptest.NewRequest(http.MethodPost, "/api/commands/create", strings.NewReader(first))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(httptest.NewRecorder(), req)

	second := `{"trigger":"claimed","enabled":true,"cooldown_seconds":0,"splash_template":"y","sound":"","duration_ms":5000}`
	rec := httptest.NewRecorder()
	req2 := httptest.NewRequest(http.MethodPost, "/api/commands/create", strings.NewReader(second))
	req2.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req2)
	require.Equal(t, http.StatusBadRequest, rec.Code)

	var payload struct {
		Fields map[string]string `json:"fields"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Equal(t, "trigger already exists", payload.Fields["trigger"])
}

func TestCommands_WhenAliasCollidesWithSeedTrigger_ExpectFieldErrorAndUnchangedCatalog(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	body := `{"trigger":"other","aliases":["gg"],"enabled":true,"cooldown_seconds":0,"splash_template":"x","sound":"","duration_ms":5000}`
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/commands/create", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusBadRequest, rec.Code)

	var payload struct {
		Fields map[string]string `json:"fields"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Equal(t, "alias already exists", payload.Fields["aliases"])

	listRec := httptest.NewRecorder()
	env.Handler.ServeHTTP(listRec, httptest.NewRequest(http.MethodGet, "/api/commands", nil))
	require.Equal(t, http.StatusOK, listRec.Code)

	var listPayload struct {
		Commands []struct {
			Trigger string `json:"trigger"`
		} `json:"commands"`
	}
	require.NoError(t, json.Unmarshal(listRec.Body.Bytes(), &listPayload))
	require.Len(t, listPayload.Commands, 4)
	triggers := map[string]bool{}
	for _, cmd := range listPayload.Commands {
		triggers[cmd.Trigger] = true
	}
	require.True(t, triggers["gg"])
	require.True(t, triggers["hi"])
}

func TestCommands_WhenAliasEqualsOwnTrigger_ExpectFieldError(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	body := `{"trigger":"heat","aliases":["heat"],"enabled":true,"cooldown_seconds":0,"splash_template":"x","sound":"","duration_ms":5000}`
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/commands/create", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(rec, req)
	require.Equal(t, http.StatusBadRequest, rec.Code)

	var payload struct {
		Fields map[string]string `json:"fields"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	require.Equal(t, "alias must not match trigger", payload.Fields["aliases"])
}

func TestCommands_WhenUpdateOmitsAliases_ExpectCleared(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	createBody := `{"trigger":"clear","aliases":["keep"],"enabled":true,"cooldown_seconds":0,"splash_template":"x","sound":"","duration_ms":5000}`
	createRec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/commands/create", strings.NewReader(createBody))
	req.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(createRec, req)
	require.Equal(t, http.StatusOK, createRec.Code)

	var created struct {
		ID string `json:"id"`
	}
	require.NoError(t, json.Unmarshal(createRec.Body.Bytes(), &created))

	updateBody := `{"id":"` + created.ID + `","trigger":"clear","enabled":true,"cooldown_seconds":0,"splash_template":"x","sound":"","duration_ms":5000}`
	updateRec := httptest.NewRecorder()
	updateReq := httptest.NewRequest(http.MethodPost, "/api/commands/update", strings.NewReader(updateBody))
	updateReq.Header.Set("Content-Type", "application/json")
	env.Handler.ServeHTTP(updateRec, updateReq)
	require.Equal(t, http.StatusOK, updateRec.Code)
	require.Contains(t, updateRec.Body.String(), `"aliases":[]`)
}
