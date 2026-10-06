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

func TestSessions_WhenStartIncludesTitle_ExpectHistoryAndEmptySuggestion(t *testing.T) {
	env := newTestEnv(t, bus.New(0))

	start := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/sessions/start", strings.NewReader(`{"title":" Phantom Reapers "}`))
	env.Handler.ServeHTTP(start, req)
	require.Equal(t, http.StatusOK, start.Code)

	list := httptest.NewRecorder()
	env.Handler.ServeHTTP(list, httptest.NewRequest(http.MethodGet, "/api/sessions?limit=5", nil))
	require.Equal(t, http.StatusOK, list.Code)
	var page struct {
		Sessions []struct {
			ID        string `json:"id"`
			Title     string `json:"title"`
			IsCurrent bool   `json:"is_current"`
		} `json:"sessions"`
	}
	require.NoError(t, json.Unmarshal(list.Body.Bytes(), &page))
	require.NotEmpty(t, page.Sessions)
	require.True(t, page.Sessions[0].IsCurrent)
	require.Equal(t, "Phantom Reapers", page.Sessions[0].Title)

	detail := httptest.NewRecorder()
	env.Handler.ServeHTTP(detail, httptest.NewRequest(http.MethodGet, "/api/sessions/get?id="+page.Sessions[0].ID, nil))
	require.Equal(t, http.StatusOK, detail.Code)
	require.Contains(t, detail.Body.String(), `"title":"Phantom Reapers"`)

	suggestion := httptest.NewRecorder()
	env.Handler.ServeHTTP(suggestion, httptest.NewRequest(http.MethodGet, "/api/sessions/title-suggestion", nil))
	require.Equal(t, http.StatusOK, suggestion.Code)
	require.JSONEq(t, `{"title":""}`, suggestion.Body.String())
}

func TestSessions_WhenTitleIsInvalid_ExpectCurrentSessionUnchanged(t *testing.T) {
	env := newTestEnv(t, bus.New(0))
	before := httptest.NewRecorder()
	env.Handler.ServeHTTP(before, httptest.NewRequest(http.MethodGet, "/api/sessions?limit=1", nil))
	var prior struct {
		Sessions []struct {
			ID string `json:"id"`
		} `json:"sessions"`
	}
	require.NoError(t, json.Unmarshal(before.Body.Bytes(), &prior))
	require.NotEmpty(t, prior.Sessions)

	start := httptest.NewRecorder()
	body := `{"title":"` + strings.Repeat("я", 141) + `"}`
	env.Handler.ServeHTTP(start, httptest.NewRequest(http.MethodPost, "/api/sessions/start", strings.NewReader(body)))
	require.Equal(t, http.StatusBadRequest, start.Code)

	after := httptest.NewRecorder()
	env.Handler.ServeHTTP(after, httptest.NewRequest(http.MethodGet, "/api/sessions?limit=1", nil))
	var next struct {
		Sessions []struct {
			ID string `json:"id"`
		} `json:"sessions"`
	}
	require.NoError(t, json.Unmarshal(after.Body.Bytes(), &next))
	require.Equal(t, prior.Sessions[0].ID, next.Sessions[0].ID)
}
