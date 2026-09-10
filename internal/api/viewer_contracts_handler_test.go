package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
)

func TestViewerContracts_WhenOpenedReadAndRepeated_ExpectPublicLifecycleShape(t *testing.T) {
	// Arrange
	env := newTestEnv(t, bus.New(0))

	// Act
	open := httptest.NewRecorder()
	env.Handler.ServeHTTP(open, httptest.NewRequest(http.MethodPost, "/api/viewer-contracts/open", strings.NewReader(`{
		"title":" Find loot ","objective":" Mark the cave ","reward_id":"joke"
	}`)))
	repeat := httptest.NewRecorder()
	var opened struct {
		Contract struct {
			ID string `json:"id"`
		} `json:"contract"`
	}
	require.NoError(t, json.Unmarshal(open.Body.Bytes(), &opened))
	env.Handler.ServeHTTP(repeat, httptest.NewRequest(http.MethodPost, "/api/viewer-contracts/announce", strings.NewReader(`{"id":"`+opened.Contract.ID+`"}`)))
	current := httptest.NewRecorder()
	env.Handler.ServeHTTP(current, httptest.NewRequest(http.MethodGet, "/api/viewer-contracts/current", nil))

	// Assert
	require.Equal(t, http.StatusOK, open.Code)
	require.Equal(t, http.StatusOK, repeat.Code)
	require.Equal(t, http.StatusOK, current.Code)
	var payload struct {
		Contract struct {
			ID           string `json:"id"`
			Title        string `json:"title"`
			Objective    string `json:"objective"`
			RewardID     string `json:"reward_id"`
			RewardName   string `json:"reward_name"`
			RewardPoints int    `json:"reward_points"`
			AnnouncedAt  string `json:"announced_at"`
		} `json:"contract"`
	}
	require.NoError(t, json.Unmarshal(current.Body.Bytes(), &payload))
	require.Equal(t, opened.Contract.ID, payload.Contract.ID)
	require.Equal(t, "Find loot", payload.Contract.Title)
	require.Equal(t, "Mark the cave", payload.Contract.Objective)
	require.Equal(t, "joke", payload.Contract.RewardID)
	require.Equal(t, "Joke", payload.Contract.RewardName)
	require.Equal(t, 10, payload.Contract.RewardPoints)
	require.NotEmpty(t, payload.Contract.AnnouncedAt)
}

func TestViewerContracts_WhenInvalidConflictOrStale_ExpectDocumentedStatus(t *testing.T) {
	// Arrange
	env := newTestEnv(t, bus.New(0))

	// Act / Assert
	invalid := httptest.NewRecorder()
	env.Handler.ServeHTTP(invalid, httptest.NewRequest(http.MethodPost, "/api/viewer-contracts/open", strings.NewReader(`{"title":"","objective":"x","reward_id":"joke"}`)))
	require.Equal(t, http.StatusBadRequest, invalid.Code)

	open := httptest.NewRecorder()
	env.Handler.ServeHTTP(open, httptest.NewRequest(http.MethodPost, "/api/viewer-contracts/open", strings.NewReader(`{"title":"Find loot","objective":"Mark it","reward_id":"joke"}`)))
	require.Equal(t, http.StatusOK, open.Code)

	conflict := httptest.NewRecorder()
	env.Handler.ServeHTTP(conflict, httptest.NewRequest(http.MethodPost, "/api/viewer-contracts/open", strings.NewReader(`{"title":"Second","objective":"No","reward_id":"joke"}`)))
	require.Equal(t, http.StatusConflict, conflict.Code)

	stale := httptest.NewRecorder()
	env.Handler.ServeHTTP(stale, httptest.NewRequest(http.MethodPost, "/api/viewer-contracts/announce", strings.NewReader(`{"id":"stale"}`)))
	require.Equal(t, http.StatusConflict, stale.Code)

	missingCloseID := httptest.NewRecorder()
	env.Handler.ServeHTTP(missingCloseID, httptest.NewRequest(http.MethodPost, "/api/viewer-contracts/close", strings.NewReader(`{"id":" "}`)))
	require.Equal(t, http.StatusBadRequest, missingCloseID.Code)

	wrongMethod := httptest.NewRecorder()
	env.Handler.ServeHTTP(wrongMethod, httptest.NewRequest(http.MethodGet, "/api/viewer-contracts/open", nil))
	require.Equal(t, http.StatusNotFound, wrongMethod.Code)
}

func TestViewerContracts_WhenNoActiveContract_ExpectNullContract(t *testing.T) {
	// Arrange
	env := newTestEnv(t, bus.New(0))

	// Act
	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/viewer-contracts/current", nil))

	// Assert
	require.Equal(t, http.StatusOK, rec.Code)
	require.JSONEq(t, `{"contract":null,"content":"contract","visible":false}`, rec.Body.String())
}

func TestViewerContracts_WhenWebSocketConnectsAfterOpen_ExpectNoAutomaticReplay(t *testing.T) {
	// Arrange
	env := newTestEnv(t, bus.New(0))
	opened := httptest.NewRecorder()
	env.Handler.ServeHTTP(opened, httptest.NewRequest(http.MethodPost, "/api/viewer-contracts/open", strings.NewReader(`{"title":"Find loot","objective":"Mark it","reward_id":"joke"}`)))
	require.Equal(t, http.StatusOK, opened.Code)
	server := httptest.NewServer(env.Handler)
	t.Cleanup(server.Close)

	// Act
	connection, _, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(server.URL, "http")+"/ws", nil)
	require.NoError(t, err)
	t.Cleanup(func() { _ = connection.Close() })
	require.NoError(t, connection.SetReadDeadline(time.Now().Add(250*time.Millisecond)))
	foundState := false
	for {
		_, frame, readErr := connection.ReadMessage()
		if readErr != nil {
			break
		}
		var decoded map[string]any
		require.NoError(t, json.Unmarshal(frame, &decoded))
		require.NotEqual(t, "contract", decoded["source"], "brief announcement must not replay")
		if decoded["type"] == wireViewerContractStateType {
			foundState = true
			contract := decoded["contract"].(map[string]any)
			require.Equal(t, "Find loot", contract["title"])
			require.Equal(t, contractContentContract, decoded["content"])
			require.Equal(t, true, decoded["visible"])
		}
	}
	require.True(t, foundState, "active presentation snapshot must be sent on reconnect")
}

func TestViewerContracts_WhenDisplayChanges_ExpectAuthoritativeStateAndStaleConflict(t *testing.T) {
	// Arrange
	env := newTestEnv(t, bus.New(0))
	contractID := openViewerContractForTest(t, env, "Find loot", "Mark it")

	// Act
	display := httptest.NewRecorder()
	env.Handler.ServeHTTP(display, httptest.NewRequest(http.MethodPost, "/api/viewer-contracts/display", strings.NewReader(`{"id":"`+contractID+`","content":"leaderboard","visible":false}`)))
	stale := httptest.NewRecorder()
	env.Handler.ServeHTTP(stale, httptest.NewRequest(http.MethodPost, "/api/viewer-contracts/display", strings.NewReader(`{"id":"stale","content":"contract","visible":true}`)))
	invalid := httptest.NewRecorder()
	env.Handler.ServeHTTP(invalid, httptest.NewRequest(http.MethodPost, "/api/viewer-contracts/display", strings.NewReader(`{"id":"`+contractID+`","content":"other","visible":true}`)))

	// Assert
	require.Equal(t, http.StatusOK, display.Code)
	var snapshot viewerContractPresentationSnapshot
	require.NoError(t, json.Unmarshal(display.Body.Bytes(), &snapshot))
	require.Equal(t, wireViewerContractStateType, snapshot.Type)
	require.Equal(t, contractID, snapshot.Contract.ID)
	require.Equal(t, contractContentLeaderboard, snapshot.Content)
	require.False(t, snapshot.Visible)
	require.Equal(t, http.StatusConflict, stale.Code)
	require.Equal(t, http.StatusBadRequest, invalid.Code)
}

func TestViewerContracts_WhenAwardedOrClosed_ExpectNormalAwardAndNoResultSemantics(t *testing.T) {
	// Arrange
	env := newTestEnv(t, bus.New(0))
	viewerID := seedViewer(t, env, "vk", "42", "Alice")
	first := openViewerContractForTest(t, env, "Find loot", "Mark it")

	// Act: settlement accepts only the canonical viewer id and returns the
	// normal operator-award outcome data.
	award := httptest.NewRecorder()
	env.Handler.ServeHTTP(award, httptest.NewRequest(http.MethodPost, "/api/viewer-contracts/award", strings.NewReader(`{"id":"`+first+`","viewer_id":"`+viewerID+`"}`)))
	history := httptest.NewRecorder()
	env.Handler.ServeHTTP(history, httptest.NewRequest(http.MethodGet, "/api/reward-history?viewer_id="+viewerID, nil))
	second := openViewerContractForTest(t, env, "Find backup", "Mark it too")
	closeResponse := httptest.NewRecorder()
	env.Handler.ServeHTTP(closeResponse, httptest.NewRequest(http.MethodPost, "/api/viewer-contracts/close", strings.NewReader(`{"id":"`+second+`"}`)))
	afterClose := httptest.NewRecorder()
	env.Handler.ServeHTTP(afterClose, httptest.NewRequest(http.MethodGet, "/api/reward-history?viewer_id="+viewerID, nil))

	// Assert
	require.Equal(t, http.StatusOK, award.Code)
	require.JSONEq(t, `{"contract_id":"`+first+`","viewer_id":"`+viewerID+`","points":10}`, award.Body.String())
	require.Equal(t, http.StatusOK, history.Code)
	var firstHistory, secondHistory struct {
		Entries []map[string]any `json:"entries"`
	}
	require.NoError(t, json.Unmarshal(history.Body.Bytes(), &firstHistory))
	require.Len(t, firstHistory.Entries, 1)
	require.Equal(t, "award", firstHistory.Entries[0]["kind"])
	require.Equal(t, "joke", firstHistory.Entries[0]["reward_id"])
	require.NotContains(t, firstHistory.Entries[0], "contract_id")
	require.NotContains(t, firstHistory.Entries[0], "title")
	require.NotContains(t, firstHistory.Entries[0], "objective")
	require.Equal(t, http.StatusOK, closeResponse.Code)
	require.JSONEq(t, `{"contract_id":"`+second+`","closed":true}`, closeResponse.Body.String())
	require.Equal(t, http.StatusOK, afterClose.Code)
	require.NoError(t, json.Unmarshal(afterClose.Body.Bytes(), &secondHistory))
	require.Len(t, secondHistory.Entries, 1, "close without result must not append history")

	stale := httptest.NewRecorder()
	env.Handler.ServeHTTP(stale, httptest.NewRequest(http.MethodPost, "/api/viewer-contracts/close", strings.NewReader(`{"id":"`+second+`"}`)))
	require.Equal(t, http.StatusConflict, stale.Code)
}

func TestViewerContracts_WhenWinnerMissing_Expect404AndActiveContractPreserved(t *testing.T) {
	// Arrange
	env := newTestEnv(t, bus.New(0))
	contractID := openViewerContractForTest(t, env, "Find loot", "Mark it")

	// Act
	award := httptest.NewRecorder()
	env.Handler.ServeHTTP(award, httptest.NewRequest(http.MethodPost, "/api/viewer-contracts/award", strings.NewReader(`{"id":"`+contractID+`","viewer_id":"missing"}`)))
	current := httptest.NewRecorder()
	env.Handler.ServeHTTP(current, httptest.NewRequest(http.MethodGet, "/api/viewer-contracts/current", nil))

	// Assert
	require.Equal(t, http.StatusNotFound, award.Code)
	require.Contains(t, current.Body.String(), contractID)
}

func openViewerContractForTest(t *testing.T, env testEnv, title, objective string) string {
	t.Helper()
	rec := httptest.NewRecorder()
	env.Handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/viewer-contracts/open", strings.NewReader(`{"title":"`+title+`","objective":"`+objective+`","reward_id":"joke"}`)))
	require.Equal(t, http.StatusOK, rec.Code)
	var response struct {
		Contract struct {
			ID string `json:"id"`
		} `json:"contract"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
	require.NotEmpty(t, response.Contract.ID)
	return response.Contract.ID
}
