package aimessage

import (
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/store"
)

type transportFunc func(*http.Request) (*http.Response, error)

func (f transportFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func response(body []byte) *http.Response {
	return &http.Response{StatusCode: 200, Header: make(http.Header), Body: io.NopCloser(bytes.NewReader(body))}
}
func completion(t *testing.T, value any) []byte {
	t.Helper()
	content, err := json.Marshal(value)
	require.NoError(t, err)
	out, err := json.Marshal(map[string]any{"choices": []any{map[string]any{"finish_reason": "stop", "message": map[string]string{"content": string(content)}}}, "usage": map[string]int{"total_tokens": 42}})
	require.NoError(t, err)
	return out
}
func wave(seconds int) []byte {
	data := make([]byte, 44+8000*2*seconds)
	copy(data, "RIFF")
	binary.LittleEndian.PutUint32(data[4:], uint32(len(data)-8))
	copy(data[8:], "WAVEfmt ")
	binary.LittleEndian.PutUint32(data[16:], 16)
	binary.LittleEndian.PutUint16(data[20:], 1)
	binary.LittleEndian.PutUint16(data[22:], 1)
	binary.LittleEndian.PutUint32(data[24:], 8000)
	binary.LittleEndian.PutUint32(data[28:], 16000)
	binary.LittleEndian.PutUint16(data[32:], 2)
	binary.LittleEndian.PutUint16(data[34:], 16)
	copy(data[36:], "data")
	binary.LittleEndian.PutUint32(data[40:], uint32(len(data)-44))
	return data
}
func fixture(t *testing.T) (*Service, *config.Store, *[]map[string]any) {
	t.Helper()
	dir := t.TempDir()
	db, err := store.Open(filepath.Join(dir, "test.db"), store.OpenOptions{})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, db.Close()) })
	cfg := config.Default()
	cfg.Features.ExperimentalAIMessages = true
	cfg.AIMessages.LLM.Model = "test-model"
	cfg.AIMessages.Limits.GlobalIntervalSeconds = 0
	cfg.AIMessages.Limits.ViewerCooldownSeconds = 0
	t.Setenv("OPENAI_API_KEY", "test-key")
	t.Setenv("ELEVENLABS_API_KEY", "test-key")
	require.NoError(t, os.Mkdir(filepath.Join(dir, "overlay-assets"), 0700))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "overlay-assets", "asset_test.png"), []byte("image"), 0600))
	cmd, err := db.CreateCommand(store.CreateCommandInput{Trigger: "fixture", Enabled: true, Action: "alert", SplashTemplate: "fixture", ImageAsset: "asset_test.png", DurationMs: 5000, SoundVolume: 70})
	require.NoError(t, err)
	cfg.AIMessages.Characters = []config.AICharacter{{ID: "jake", Label: "Jake", VoiceID: "test_voice", DefaultDelivery: "neutral", Images: []config.AIImage{{ID: "image", CommandID: cmd.ID}}}}
	cs, err := config.NewStore(filepath.Join(dir, "config.json"), cfg)
	require.NoError(t, err)
	frames := []map[string]any{}
	s, err := New(cs, db, func(data []byte) {
		var frame map[string]any
		require.NoError(t, json.Unmarshal(data, &frame))
		if frame["type"] != "ai_message_status" {
			frames = append(frames, frame)
		}
	})
	require.NoError(t, err)
	return s, cs, &frames
}
func prepared(decision string) Prepared {
	return Prepared{DisplayText: "У нас 2 млн C-Bills.", Segments: []Segment{{Text: "У нас два миллиона си-биллов.", Delivery: "neutral"}}, CharacterID: "jake", ImageID: "image", InputDecision: decision, ReasonCode: "test", Reason: "Fixture verdict"}
}
func mockProvider(t *testing.T, s *Service, decision string) *int {
	t.Helper()
	calls := 0
	s.provider.Client = &http.Client{Transport: transportFunc(func(r *http.Request) (*http.Response, error) {
		calls++
		if strings.Contains(r.URL.Path, "text-to-speech") {
			return response(wave(2)), nil
		}
		if calls == 1 {
			return response(completion(t, prepared(decision))), nil
		}
		return response(completion(t, Verdict{Decision: "allow"})), nil
	})}
	return &calls
}
func TestPipeline_Allowed_ProducesOneValidatedAlert(t *testing.T) {
	s, _, frames := fixture(t)
	calls := mockProvider(t, s, "allow")
	j, err := s.Admit(context.Background(), "twitch", "one", "viewer", "Viewer", "У нас 2 млн C-Bills.")
	require.NoError(t, err)
	s.process(context.Background(), j.ID)
	page := s.List(context.Background(), "", "", 50)
	require.Equal(t, "dispatched", page.Items[0].State)
	require.Equal(t, 3, *calls)
	require.Len(t, *frames, 1)
	require.Equal(t, "ai_message", (*frames)[0]["source"])
	require.Equal(t, float64(3000), (*frames)[0]["duration_ms"])
	require.FileExists(t, filepath.Join(s.dir, page.Items[0].AudioAsset))
	require.Equal(t, "У нас 2 млн C-Bills.", page.Items[0].Prepared.DisplayText)
	_, err = s.Admit(context.Background(), "twitch", "one", "viewer", "Viewer", "same")
	require.ErrorIs(t, err, ErrConflict)
	require.Equal(t, 3, *calls)
}
func TestReview_ConcurrentApproval_SynthesizesOnceWithoutRewriting(t *testing.T) {
	s, _, _ := fixture(t)
	calls := mockProvider(t, s, "review")
	j, err := s.Admit(context.Background(), "twitch", "one", "viewer", "Viewer", "Test")
	require.NoError(t, err)
	s.queue = nil
	s.process(context.Background(), j.ID)
	pending := s.List(context.Background(), "", "", 10).Items[0]
	require.Equal(t, "review_pending", pending.State)
	require.Equal(t, 2, *calls)
	var wg sync.WaitGroup
	results := make(chan error, 2)
	for range 2 {
		wg.Go(func() { _, e := s.Action(context.Background(), j.ID, pending.Revision, "approve"); results <- e })
	}
	wg.Wait()
	close(results)
	success := 0
	for e := range results {
		if e == nil {
			success++
		} else {
			require.ErrorIs(t, e, ErrConflict)
		}
	}
	require.Equal(t, 1, success)
	s.process(context.Background(), j.ID)
	require.Equal(t, 3, *calls)
	require.Equal(t, pending.Prepared, s.List(context.Background(), "", "", 10).Items[0].Prepared)
}
func TestRejectedInput_NeverSynthesizes(t *testing.T) {
	s, _, frames := fixture(t)
	calls := mockProvider(t, s, "reject")
	j, err := s.Admit(context.Background(), "twitch", "one", "viewer", "Viewer", "Test")
	require.NoError(t, err)
	s.process(context.Background(), j.ID)
	require.Equal(t, 1, *calls)
	require.Empty(t, *frames)
	require.Equal(t, "rejected", s.List(context.Background(), "", "", 10).Items[0].State)
}
func TestDisableDuringSynthesis_DiscardsLateResponse(t *testing.T) {
	s, cfg, frames := fixture(t)
	entered := make(chan struct{})
	release := make(chan struct{})
	calls := 0
	s.provider.Client = &http.Client{Transport: transportFunc(func(r *http.Request) (*http.Response, error) {
		calls++
		if calls == 1 {
			return response(completion(t, prepared("allow"))), nil
		}
		if calls == 2 {
			return response(completion(t, Verdict{Decision: "allow"})), nil
		}
		close(entered)
		<-release
		return response(wave(2)), nil
	})}
	j, err := s.Admit(context.Background(), "twitch", "one", "viewer", "Viewer", "Test")
	require.NoError(t, err)
	done := make(chan struct{})
	go func() { defer close(done); s.process(context.Background(), j.ID) }()
	<-entered
	require.NoError(t, cfg.Mutate(func(c *config.Config) error { c.Features.ExperimentalAIMessages = false; return nil }))
	s.Sync(context.Background())
	close(release)
	<-done
	for _, frame := range *frames {
		require.NotEqual(t, "alert", frame["type"])
	}
	require.Equal(t, "canceled", s.List(context.Background(), "", "", 10).Items[0].State)
}
func TestAdmission_BoundsAndExpiredReview(t *testing.T) {
	s, _, _ := fixture(t)
	_, err := s.Admit(context.Background(), "twitch", "long", "viewer", "Viewer", strings.Repeat("я", 301))
	require.ErrorIs(t, err, ErrInvalid)
	calls := mockProvider(t, s, "review")
	j, err := s.Admit(context.Background(), "twitch", "one", "viewer", "Viewer", strings.Repeat("я", 300))
	require.NoError(t, err)
	s.process(context.Background(), j.ID)
	pending := s.List(context.Background(), "", "", 10).Items[0]
	s.now = func() time.Time { return pending.ReviewExpiresAt.Add(time.Second) }
	_, err = s.Action(context.Background(), j.ID, pending.Revision, "approve")
	require.ErrorIs(t, err, ErrConflict)
	require.Equal(t, 2, *calls)
}
func TestProviderFailure_NoRetryAndPause(t *testing.T) {
	s, _, frames := fixture(t)
	calls := 0
	s.provider.Client = &http.Client{Transport: transportFunc(func(_ *http.Request) (*http.Response, error) {
		calls++
		r := response([]byte(`{"error":{"code":"insufficient_quota"}}`))
		r.StatusCode = 429
		return r, nil
	})}
	j, err := s.Admit(context.Background(), "twitch", "one", "viewer", "Viewer", "Test")
	require.NoError(t, err)
	s.process(context.Background(), j.ID)
	require.Equal(t, 1, calls)
	require.Empty(t, *frames)
	require.Equal(t, "quota_exhausted", s.List(context.Background(), "", "", 10).ServiceState)
}
func TestPrepared_InvalidIDsMarkupAndTruncationFailClosed(t *testing.T) {
	s, _, _ := fixture(t)
	p := prepared("allow")
	p.ImageID = "https://example.com"
	require.ErrorIs(t, validatePrepared(p, s.cfg.Snapshot().AIMessages), ErrInvalid)
	p = prepared("allow")
	p.Segments[0].Text = "[shouts] hi"
	require.ErrorIs(t, validatePrepared(p, s.cfg.Snapshot().AIMessages), ErrInvalid)
	var v Verdict
	require.ErrorIs(t, strictDecode([]byte(`{"decision":"allow","extra":true}`), &v), ErrInvalid)
	require.ErrorIs(t, strictDecode([]byte(`{"decision":`), &v), ErrInvalid)
}
func TestRestart_CancelsInsteadOfReplaying(t *testing.T) {
	s, cfg, _ := fixture(t)
	_, err := s.Admit(context.Background(), "twitch", "one", "viewer", "Viewer", "Test")
	require.NoError(t, err)
	restarted, err := New(cfg, s.db, nil)
	require.NoError(t, err)
	require.Equal(t, "canceled", restarted.List(context.Background(), "", "", 10).Items[0].State)
}
func TestParse_ExactOnly(t *testing.T) {
	for _, line := range []string{"!m hello", " !M привет ", "!m"} {
		_, ok := Parse(line)
		require.True(t, ok)
	}
	for _, line := range []string{"!mm hi", "!more hi", "x !m hi"} {
		_, ok := Parse(line)
		require.False(t, ok)
	}
}

func TestPrepared_RequiredFieldsAndUsageSanitization(t *testing.T) {
	require.False(t, matchesSchema(json.RawMessage(`{"decision":"allow"}`), objectSchema(map[string]any{"decision": decisionSchema(), "reason": stringSchema()})))
	require.False(t, matchesSchema(json.RawMessage(`{"decision":"allow","reason":null}`), objectSchema(map[string]any{"decision": decisionSchema(), "reason": stringSchema()})))
	require.JSONEq(t, `{"total_tokens":12}`, string(safeUsage(json.RawMessage(`{"total_tokens":12,"secret":"private","cost":"key"}`))))
}
func TestOutputDenylist_StopsBeforeSpeech(t *testing.T) {
	s, cfg, frames := fixture(t)
	require.NoError(t, cfg.Mutate(func(c *config.Config) error { c.AIMessages.Denylist = []string{"си-биллов"}; return nil }))
	calls := mockProvider(t, s, "allow")
	j, err := s.Admit(context.Background(), "twitch", "one", "viewer", "Viewer", "Test")
	require.NoError(t, err)
	s.process(context.Background(), j.ID)
	require.Equal(t, 2, *calls)
	require.Equal(t, "rejected", s.List(context.Background(), "", "", 10).Items[0].State)
	for _, frame := range *frames {
		require.NotEqual(t, "alert", frame["type"])
	}
}
func TestRetention_PreservesDedupeAndImportedAssets(t *testing.T) {
	s, _, _ := fixture(t)
	mockProvider(t, s, "allow")
	j, err := s.Admit(context.Background(), "twitch", "one", "viewer", "Viewer", "Test")
	require.NoError(t, err)
	s.process(context.Background(), j.ID)
	s.queue = nil
	now := s.now().Add(3 * time.Minute)
	s.now = func() time.Time { return now }
	require.Equal(t, 1, s.ClearHistory(context.Background()))
	require.FileExists(t, filepath.Join(s.dir, "asset_test.png"))
	_, err = s.Admit(context.Background(), "twitch", "one", "viewer", "Viewer", "Test")
	require.ErrorIs(t, err, ErrConflict)
}
func TestStartup_CorruptAIRecordPausesOnlyExperiment(t *testing.T) {
	s, cfg, _ := fixture(t)
	now := time.Now()
	require.NoError(t, s.db.CreateAIRecord(context.Background(), store.AIRecord{ID: "bad", Revision: 1, State: "queued", CreatedAt: now, UpdatedAt: now, Payload: []byte(`{broken`)}, "bad"))
	restarted, err := New(cfg, s.db, nil)
	require.NoError(t, err)
	require.Equal(t, "storage_error", restarted.List(context.Background(), "", "", 10).ServiceState)
	require.ErrorIs(t, restarted.Resume(context.Background()), ErrUnavailable)
}

func TestFinalVerdict_RejectDominatesReview(t *testing.T) {
	s, _, frames := fixture(t)
	calls := 0
	s.provider.Client = &http.Client{Transport: transportFunc(func(_ *http.Request) (*http.Response, error) {
		calls++
		if calls == 1 {
			return response(completion(t, prepared("review"))), nil
		}
		return response(completion(t, Verdict{Decision: "reject", ReasonCode: "unsafe", Reason: "Forbidden output"})), nil
	})}
	j, err := s.Admit(context.Background(), "twitch", "one", "viewer", "Viewer", "Test")
	require.NoError(t, err)
	s.process(context.Background(), j.ID)
	require.Equal(t, "rejected", s.List(context.Background(), "", "", 10).Items[0].State)
	require.Equal(t, 2, calls)
	require.Empty(t, *frames)
}
func TestOversizedAudio_NeverDispatched(t *testing.T) {
	s, _, frames := fixture(t)
	calls := 0
	s.provider.Client = &http.Client{Transport: transportFunc(func(r *http.Request) (*http.Response, error) {
		calls++
		if strings.Contains(r.URL.Path, "text-to-speech") {
			return response(wave(31)), nil
		}
		if calls == 1 {
			return response(completion(t, prepared("allow"))), nil
		}
		return response(completion(t, Verdict{Decision: "allow"})), nil
	})}
	j, err := s.Admit(context.Background(), "twitch", "one", "viewer", "Viewer", "Test")
	require.NoError(t, err)
	s.process(context.Background(), j.ID)
	require.Equal(t, "audio_duration", s.List(context.Background(), "", "", 10).Items[0].ErrorCode)
	require.Empty(t, *frames)
}
func TestQueueFull_LeavesReviewPending(t *testing.T) {
	s, _, _ := fixture(t)
	mockProvider(t, s, "review")
	j, err := s.Admit(context.Background(), "twitch", "one", "viewer", "Viewer", "Test")
	require.NoError(t, err)
	s.queue = nil
	s.process(context.Background(), j.ID)
	pending := s.List(context.Background(), "", "", 10).Items[0]
	for _, id := range []string{"two", "three", "four"} {
		_, err = s.Admit(context.Background(), "twitch", id, id, id, "Test")
		require.NoError(t, err)
	}
	_, err = s.Action(context.Background(), j.ID, pending.Revision, "approve")
	require.ErrorIs(t, err, ErrConflict)
	require.Equal(t, "review_pending", s.jobs[j.ID].State)
}

// This corpus checks routing with fixed verdicts, not a live model's accuracy.
func TestModerationCorpus_DeterministicRouting(t *testing.T) {
	data, err := os.ReadFile("testdata/moderation.json")
	require.NoError(t, err)
	var cases []struct {
		ID       string `json:"id"`
		Text     string `json:"text"`
		Expected string `json:"expected"`
	}
	require.NoError(t, json.Unmarshal(data, &cases))
	require.GreaterOrEqual(t, len(cases), 40)
	for _, tc := range cases {
		t.Run(tc.ID, func(t *testing.T) {
			s, _, frames := fixture(t)
			calls := mockProvider(t, s, tc.Expected)
			j, err := s.Admit(context.Background(), "twitch", tc.ID, "viewer", "Viewer", tc.Text)
			if strings.ContainsRune(tc.Text, '\u200b') {
				require.ErrorIs(t, err, ErrInvalid)
				require.Zero(t, *calls)
				return
			}
			require.NoError(t, err)
			s.process(context.Background(), j.ID)
			state := map[string]string{"allow": "dispatched", "review": "review_pending", "reject": "rejected"}[tc.Expected]
			require.Equal(t, state, s.List(context.Background(), "", "", 10).Items[0].State)
			if tc.Expected != "allow" {
				require.Empty(t, *frames)
			}
		})
	}
}

func TestCooldown_IsConsumedOnlyByAcceptedMessages(t *testing.T) {
	s, cfg, _ := fixture(t)
	require.NoError(t, cfg.Mutate(func(c *config.Config) error {
		c.AIMessages.Limits.ViewerCooldownSeconds = 60
		c.AIMessages.Limits.GlobalIntervalSeconds = 10
		return nil
	}))
	now := time.Now()
	s.now = func() time.Time { return now }
	_, err := s.Admit(context.Background(), "twitch", "bad", "viewer", "Viewer", "")
	require.ErrorIs(t, err, ErrInvalid)
	_, err = s.Admit(context.Background(), "twitch", "one", "viewer", "Viewer", "Test")
	require.NoError(t, err)
	_, err = s.Admit(context.Background(), "twitch", "two", "other", "Other", "Test")
	require.ErrorIs(t, err, ErrConflict)
	now = now.Add(11 * time.Second)
	_, err = s.Admit(context.Background(), "twitch", "three", "viewer", "Viewer", "Test")
	require.ErrorIs(t, err, ErrConflict)
	_, err = s.Admit(context.Background(), "twitch", "four", "other", "Other", "Test")
	require.NoError(t, err)
}
func TestProviderHTTPFailures_NoRetryOrUpstreamSecretExposure(t *testing.T) {
	for _, status := range []int{400, 401, 402, 403, 429, 500} {
		t.Run(http.StatusText(status), func(t *testing.T) {
			s, _, _ := fixture(t)
			calls := 0
			s.provider.Client = &http.Client{Transport: transportFunc(func(_ *http.Request) (*http.Response, error) {
				calls++
				r := response([]byte(`{"error":{"message":"private upstream token"}}`))
				r.StatusCode = status
				r.Header.Set("Retry-After", "999999")
				return r, nil
			})}
			_, _, err := s.provider.Prepare(context.Background(), s.cfg.Snapshot().AIMessages, "Test")
			require.Error(t, err)
			require.NotContains(t, err.Error(), "private")
			require.Equal(t, 1, calls)
			var providerError *ProviderError
			require.ErrorAs(t, err, &providerError)
			if status == 429 {
				require.Equal(t, 5*time.Minute, providerError.RetryAfter)
			}
			if status == 401 || status == 402 || status == 403 {
				require.True(t, providerError.Pause)
			}
		})
	}
}

func TestStartup_MissingKeyPausesAdmissionWithoutFailingApplication(t *testing.T) {
	s, cfg, _ := fixture(t)
	t.Setenv("OPENAI_API_KEY", "")
	restarted, err := New(cfg, s.db, nil)
	require.NoError(t, err)
	require.Equal(t, "configuration", restarted.List(context.Background(), "", "", 10).ServiceState)
	_, err = restarted.Admit(context.Background(), "twitch", "one", "viewer", "Viewer", "Test")
	require.ErrorIs(t, err, ErrUnavailable)
}

func TestExplicitProviderTest_QuotaFailureAlsoPausesAdmission(t *testing.T) {
	s, _, frames := fixture(t)
	s.provider.Client = &http.Client{Transport: transportFunc(func(_ *http.Request) (*http.Response, error) {
		r := response([]byte(`{}`))
		r.StatusCode = 402
		return r, nil
	})}
	_, err := s.Test(context.Background(), "llm")
	require.Error(t, err)
	require.Equal(t, "quota_exhausted", s.List(context.Background(), "", "", 10).ServiceState)
	require.Empty(t, *frames)
}

func TestClearHistory_RemovesRowsImmediatelyButProtectsPlayingAudio(t *testing.T) {
	s, _, _ := fixture(t)
	mockProvider(t, s, "allow")
	j, err := s.Admit(context.Background(), "twitch", "one", "viewer", "Viewer", "Test")
	require.NoError(t, err)
	s.process(context.Background(), j.ID)
	audio := s.List(context.Background(), "", "", 10).Items[0].AudioAsset
	require.Equal(t, 1, s.ClearHistory(context.Background()))
	require.Empty(t, s.List(context.Background(), "", "", 10).Items)
	require.FileExists(t, filepath.Join(s.dir, audio))
	require.True(t, s.Referenced(audio))
}
