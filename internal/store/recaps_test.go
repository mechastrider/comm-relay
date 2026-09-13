package store_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"sync"
	"testing"
	"time"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	_ "modernc.org/sqlite"

	"github.com/mechastrider/comm-relay/internal/recap"
	"github.com/mechastrider/comm-relay/internal/store"
)

func TestCaptureStreamRecap_WhenEmptyCurrentSession_ExpectZeroTotalsSnapshot(t *testing.T) {
	s, _ := openTestStore(t)
	sessionID, err := s.CurrentSessionID()
	require.NoError(t, err)

	snapshot, err := s.CaptureStreamRecap(context.Background(), sessionID, false)
	require.NoError(t, err)
	require.NotNil(t, snapshot)
	assert.Equal(t, recap.Version, snapshot.Version)
	assert.Equal(t, sessionID, snapshot.SessionID)
	assert.Zero(t, snapshot.Totals.ViewerCount)
	assert.Zero(t, snapshot.Totals.MessageCount)
	assert.Zero(t, snapshot.Totals.XP)
}

func TestCaptureStreamRecap_WhenCalledTwice_ExpectExactStoredReplay(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now().UTC().Truncate(time.Second)
	sessionID, err := s.CurrentSessionID()
	require.NoError(t, err)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "viewer", DisplayName: "Viewer"}
	require.NoError(t, s.ApplyChat(identity, store.ActivitySettings{IntervalSeconds: 0, SessionLimit: 0, XP: 3}, testDayResetHour, now))

	first, err := s.CaptureStreamRecap(context.Background(), sessionID, false)
	require.NoError(t, err)
	second, err := s.CaptureStreamRecap(context.Background(), sessionID, false)
	require.NoError(t, err)

	firstJSON, err := first.EncodePayload()
	require.NoError(t, err)
	secondJSON, err := second.EncodePayload()
	require.NoError(t, err)
	assert.Equal(t, first.ID, second.ID)
	assert.Equal(t, firstJSON, secondJSON)
	assert.Equal(t, 1, second.Totals.MessageCount)
}

func TestCaptureStreamRecap_WhenConcurrentFirstShow_ExpectOneSnapshot(t *testing.T) {
	s, _ := openTestStore(t)
	sessionID, err := s.CurrentSessionID()
	require.NoError(t, err)

	var wg sync.WaitGroup
	results := make([]*recap.Snapshot, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			snapshot, captureErr := s.CaptureStreamRecap(context.Background(), sessionID, false)
			require.NoError(t, captureErr)
			results[idx] = snapshot
		}(i)
	}
	wg.Wait()

	require.Equal(t, results[0].ID, results[1].ID)
	firstJSON, err := results[0].EncodePayload()
	require.NoError(t, err)
	secondJSON, err := results[1].EncodePayload()
	require.NoError(t, err)
	assert.Equal(t, firstJSON, secondJSON)
}

func TestCaptureStreamRecap_WhenStaleSessionID_ExpectConflict(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now().UTC().Truncate(time.Second)
	require.NoError(t, s.StartSession(now))
	firstSessionID, err := s.CurrentSessionID()
	require.NoError(t, err)
	require.NoError(t, s.StartSession(now.Add(time.Minute)))

	_, err = s.CaptureStreamRecap(context.Background(), firstSessionID, false)
	require.Error(t, err)
	assert.True(t, errors.Is(err, store.ErrRecapSessionConflict))
}

func TestCaptureStreamRecap_WhenContextCancelledBeforeInsert_ExpectNoRow(t *testing.T) {
	s, _ := openTestStore(t)
	sessionID, err := s.CurrentSessionID()
	require.NoError(t, err)

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err = s.CaptureStreamRecap(ctx, sessionID, false)
	require.Error(t, err)

	_, err = s.LoadStreamRecap(sessionID)
	require.Error(t, err)
	assert.True(t, errors.Is(err, store.ErrRecapNotFound))
}

func TestCaptureStreamRecap_WhenCommittedBeforeCancel_ExpectSnapshotPersists(t *testing.T) {
	s, _ := openTestStore(t)
	sessionID, err := s.CurrentSessionID()
	require.NoError(t, err)

	ctx, cancel := context.WithCancel(context.Background())
	snapshot, err := s.CaptureStreamRecap(ctx, sessionID, false)
	require.NoError(t, err)
	cancel()

	loaded, err := s.LoadStreamRecap(sessionID)
	require.NoError(t, err)
	assert.Equal(t, snapshot.ID, loaded.ID)
}

func TestLoadStreamRecap_WhenPayloadInvalid_ExpectFailClosed(t *testing.T) {
	s, path := openTestStore(t)
	sessionID, err := s.CurrentSessionID()
	require.NoError(t, err)

	_, err = s.CaptureStreamRecap(context.Background(), sessionID, false)
	require.NoError(t, err)

	db, err := sql.Open("sqlite", path)
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })
	_, err = db.Exec(`UPDATE stream_recaps SET payload_json = ? WHERE session_id = ?`, `{"version":2}`, sessionID)
	require.NoError(t, err)

	_, err = s.LoadStreamRecap(sessionID)
	require.Error(t, err)
	assert.True(t, errors.Is(err, store.ErrRecapPayloadInvalid))
}

func TestCaptureStreamRecap_WhenPrivacyFiltersApply_ExpectSnapshotMatchesGetSession(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 12, 12, 0, 0, 0, time.UTC)
	sessionID, err := s.CurrentSessionID()
	require.NoError(t, err)

	hiddenIdentity := store.ChatIdentity{Platform: "twitch", UserID: "hidden", DisplayName: "Hidden"}
	publicIdentity := store.ChatIdentity{Platform: "twitch", UserID: "public", DisplayName: "Public"}
	for range 10 {
		require.NoError(t, s.ApplyChat(hiddenIdentity, disabledActivity(), testDayResetHour, now))
	}
	require.NoError(t, s.ApplyChat(publicIdentity, disabledActivity(), testDayResetHour, now))

	hiddenID, _ := s.ViewerIDForIdentity("twitch", "hidden")
	require.NoError(t, s.UpdateLeaderboardHidden(hiddenID, true))

	detail, err := s.GetSession(sessionID, false)
	require.NoError(t, err)
	snapshot, err := s.CaptureStreamRecap(context.Background(), sessionID, false)
	require.NoError(t, err)

	assert.Len(t, detail.Ranking, len(snapshot.Ranking))
	for _, entry := range snapshot.Ranking {
		assert.NotEqual(t, "Hidden", entry.DisplayName)
	}
}

func TestCaptureStreamRecap_WhenNewStreamStartsDuringShow_ExpectAtMostOneSnapshotForPriorSession(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now().UTC().Truncate(time.Second)
	firstSessionID, err := s.CurrentSessionID()
	require.NoError(t, err)

	var wg sync.WaitGroup
	var captureErr error
	wg.Add(1)
	go func() {
		defer wg.Done()
		_, captureErr = s.CaptureStreamRecap(context.Background(), firstSessionID, false)
	}()
	wg.Add(1)
	go func() {
		defer wg.Done()
		time.Sleep(5 * time.Millisecond)
		_ = s.StartSession(now.Add(time.Minute))
	}()
	wg.Wait()

	if captureErr != nil {
		assert.True(t, errors.Is(captureErr, store.ErrRecapSessionConflict))
	}

	loaded, loadErr := s.LoadStreamRecap(firstSessionID)
	if loadErr == nil {
		assert.Equal(t, firstSessionID, loaded.SessionID)
	} else {
		assert.True(t, errors.Is(loadErr, store.ErrRecapNotFound))
	}
}

func TestCaptureStreamRecap_WhenShowAfterNewStream_ExpectConflictForOldID(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now().UTC().Truncate(time.Second)
	firstSessionID, err := s.CurrentSessionID()
	require.NoError(t, err)
	require.NoError(t, s.StartSession(now.Add(time.Minute)))

	_, err = s.CaptureStreamRecap(context.Background(), firstSessionID, false)
	require.Error(t, err)
	assert.True(t, errors.Is(err, store.ErrRecapSessionConflict))
}

func TestCaptureStreamRecap_WhenAnnouncedAchievementHasEmptyDescription_ExpectSnapshotWithEmptyDescription(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 12, 12, 0, 0, 0, time.UTC)
	sessionID, err := s.CurrentSessionID()
	require.NoError(t, err)

	_, err = s.CreateAchievement(store.CreateAchievementInput{
		ID:          "empty_desc",
		Name:        "No Description",
		Description: "",
		Enabled:     true,
		Announce:    true,
		Metric:      store.ProgressionMetricMessageCount,
		Target:      1,
		Now:         now,
	})
	require.NoError(t, err)

	identity := store.ChatIdentity{Platform: "twitch", UserID: "viewer", DisplayName: "Viewer"}
	require.NoError(t, s.ApplyChat(identity, store.ActivitySettings{IntervalSeconds: 0, SessionLimit: 0, XP: 0}, testDayResetHour, now))
	viewerID, known := s.ViewerIDForIdentity("twitch", "viewer")
	require.True(t, known)
	_, err = s.InsertAchievementUnlock(store.InsertAchievementUnlockInput{
		ViewerID:      viewerID,
		SessionID:     sessionID,
		AchievementID: "empty_desc",
		Revision:      1,
		Occurrence:    1,
		ProgressValue: 1,
		Name:          "No Description",
		Description:   "",
		Backfilled:    false,
		UnlockedAt:    now,
	})
	require.NoError(t, err)

	snapshot, err := s.CaptureStreamRecap(context.Background(), sessionID, false)
	require.NoError(t, err)
	var emptyDescGroup *recap.AchievementGroup
	for i := range snapshot.AchievementGroups {
		if snapshot.AchievementGroups[i].AchievementID == "empty_desc" {
			emptyDescGroup = &snapshot.AchievementGroups[i]
			break
		}
	}
	require.NotNil(t, emptyDescGroup)
	assert.Equal(t, "", emptyDescGroup.Description)
	assert.Equal(t, "No Description", emptyDescGroup.Name)
}

func TestLoadStreamRecap_WhenStoredPayloadRoundTrips_ExpectIdenticalJSON(t *testing.T) {
	s, _ := openTestStore(t)
	sessionID, err := s.CurrentSessionID()
	require.NoError(t, err)

	snapshot, err := s.CaptureStreamRecap(context.Background(), sessionID, false)
	require.NoError(t, err)
	encoded, err := snapshot.EncodePayload()
	require.NoError(t, err)

	var raw map[string]any
	require.NoError(t, json.Unmarshal([]byte(encoded), &raw))
	loaded, err := s.LoadStreamRecap(sessionID)
	require.NoError(t, err)
	reencoded, err := loaded.EncodePayload()
	require.NoError(t, err)
	assert.Equal(t, encoded, reencoded)
}
