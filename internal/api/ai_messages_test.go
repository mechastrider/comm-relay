package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/aimessage"
	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/overlayassets"
	"github.com/mechastrider/comm-relay/internal/store"
)

func TestAIConfig_OmittedFieldsPreserveDisabledSettings(t *testing.T) {
	handler := testHandler(t)
	get := httptest.NewRecorder()
	handler.ServeHTTP(get, httptest.NewRequest(http.MethodGet, "/api/config", nil))
	var payload map[string]any
	require.NoError(t, json.Unmarshal(get.Body.Bytes(), &payload))
	payload["ai_messages"].(map[string]any)["stream_context"] = "A fictional stream"
	for _, omit := range []bool{false, true} {
		if omit {
			delete(payload, "ai_messages")
			delete(payload, "features")
		}
		body, err := json.Marshal(payload)
		require.NoError(t, err)
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/config/update", strings.NewReader(string(body))))
		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		var saved map[string]any
		require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &saved))
		require.Equal(t, false, saved["features"].(map[string]any)["experimental_ai_messages"])
		require.Equal(t, "A fictional stream", saved["ai_messages"].(map[string]any)["stream_context"])
	}
}
func TestAIRoutes_NoServiceIsUnavailable(t *testing.T) {
	mux := http.NewServeMux()
	registerAIRoutes(mux, nil)
	for _, action := range []string{"approve", "reject", "cancel", "resume", "clear-history", "test"} {
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/ai-messages/"+action, strings.NewReader(`{}`)))
		require.Equal(t, http.StatusServiceUnavailable, rec.Code)
	}
}

func TestAIIngest_QueuesWithoutOrdinaryViewerEffects(t *testing.T) {
	db := testViewerStore(t)
	cfg := testConfigStore(t)
	t.Setenv("OPENAI_API_KEY", "test-key")
	t.Setenv("ELEVENLABS_API_KEY", "test-key")
	dir := overlayassets.DirForConfig(cfg.Path())
	require.NoError(t, os.MkdirAll(dir, 0700))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "asset_test.png"), []byte("fixture"), 0600))
	cmd, err := db.CreateCommand(store.CreateCommandInput{Trigger: "fixture", Enabled: true, Action: "alert", SplashTemplate: "fixture", ImageAsset: "asset_test.png", DurationMs: 5000})
	require.NoError(t, err)
	require.NoError(t, cfg.Mutate(func(c *config.Config) error {
		c.Features.ExperimentalAIMessages = true
		c.AIMessages.LLM.Model = "test"
		c.AIMessages.Characters = []config.AICharacter{{ID: "mason", Label: "Mason", VoiceID: "voice", DefaultDelivery: "neutral", Images: []config.AIImage{{ID: "repair", CommandID: cmd.ID}}}}
		return nil
	}))
	ai, err := aimessage.New(cfg, db, nil)
	require.NoError(t, err)
	ingest := NewViewerIngest(db, cfg, nil, nil, nil, nil, nil)
	ingest.SetAIMessages(ai)
	ingest.handleMessage(context.Background(), bus.ChatMessage{ID: "empty", Platform: "twitch", UserID: "viewer", Username: "Viewer", Message: "!m"})
	require.Empty(t, ai.List(context.Background(), "", "", 10).Items)
	ingest.handleMessage(context.Background(), bus.ChatMessage{ID: "one", Platform: "twitch", UserID: "viewer", Username: "Viewer", Message: "!m Hello"})
	jobs := ai.List(context.Background(), "", "", 10).Items
	require.Len(t, jobs, 1)
	require.Equal(t, "Hello", jobs[0].OriginalText)
	require.Equal(t, "queued", jobs[0].State)
	_, found := db.ViewerIDForIdentity("twitch", "viewer")
	require.False(t, found, "AI admission must not create ordinary viewer activity")
	require.True(t, aiTriggerConflict(cfg, "M", nil))
	require.True(t, aiTriggerConflict(cfg, "other", []string{"m"}))
}
