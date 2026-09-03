package store_test

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

const testDayResetHour = 6

func openTestStore(t *testing.T) (*store.Store, string) {
	t.Helper()

	dir := t.TempDir()
	path := filepath.Join(dir, "comm-relay.db")
	s, err := store.Open(path)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, s.Close())
	})

	return s, path
}

func listAt(t *testing.T, s *store.Store, q string, dayResetHour int, now time.Time) []store.Viewer {
	t.Helper()

	viewers, err := s.List(q, dayResetHour, now)
	require.NoError(t, err)
	return viewers
}

func getAt(t *testing.T, s *store.Store, id string, dayResetHour int, now time.Time) *store.Viewer {
	t.Helper()

	viewer, err := s.Get(id, dayResetHour, now)
	require.NoError(t, err)
	return viewer
}

func TestOpen_WhenMissingDatabase_ExpectCreatedAndMigrated(t *testing.T) {
	// Arrange
	dir := t.TempDir()
	path := filepath.Join(dir, "comm-relay.db")

	// Act
	s, err := store.Open(path)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, s.Close())
	})

	// Assert
	info, err := os.Stat(path)
	require.NoError(t, err)
	assert.False(t, info.IsDir())

	viewers := listAt(t, s, "", testDayResetHour, time.Now())
	assert.Empty(t, viewers)
}

func TestApplyChat_WhenFirstMessage_ExpectViewerCreated(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 8, 25, 12, 0, 0, 0, time.UTC)

	// Act
	err := s.ApplyChat(store.ChatIdentity{
		Platform:    "twitch",
		UserID:      "42",
		Username:    "alice",
		DisplayName: "Alice",
	}, defaultActivity(), testDayResetHour, now)

	// Assert
	require.NoError(t, err)
	viewers := listAt(t, s, "", testDayResetHour, now)
	require.Len(t, viewers, 1)
	assert.Equal(t, 1, viewers[0].MessageCount)
	assert.Equal(t, 1, viewers[0].XP)
	assert.Equal(t, 1, viewers[0].SessionMessageCount)
	assert.Equal(t, 1, viewers[0].DayMessageCount)
	assert.Equal(t, "Alice", viewers[0].DisplayName)
	assert.Equal(t, "twitch", viewers[0].LastSeen.Platform)
	assert.Equal(t, "42", viewers[0].LastSeen.UserID)
}

func TestApplyChat_WhenRepeatMessage_ExpectCountersIncrement(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 8, 25, 12, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{
		Platform:    "twitch",
		UserID:      "42",
		Username:    "alice",
		DisplayName: "Alice",
		AvatarURL:   "https://example.com/a.png",
	}
	require.NoError(t, s.ApplyChat(identity, store.ActivitySettings{IntervalSeconds: 1, SessionLimit: 10, XP: 1}, testDayResetHour, now))

	// Act
	identity.DisplayName = "Alice2"
	identity.AvatarURL = "https://example.com/b.png"
	err := s.ApplyChat(identity, store.ActivitySettings{IntervalSeconds: 1, SessionLimit: 10, XP: 1}, testDayResetHour, now.Add(2*time.Second))

	// Assert
	require.NoError(t, err)
	viewer := getAt(t, s, viewerID(t, s, "twitch", "42", testDayResetHour, now.Add(time.Minute)), testDayResetHour, now.Add(time.Minute))
	assert.Equal(t, 2, viewer.MessageCount)
	assert.Equal(t, 2, viewer.XP)
	assert.Equal(t, 2, viewer.SessionMessageCount)
	assert.Equal(t, 2, viewer.SessionXP)
	assert.Equal(t, "Alice2", viewer.Identities[0].DisplayName)
	assert.Equal(t, "https://example.com/b.png", viewer.Identities[0].AvatarURL)
}

func TestApplyChat_WhenEmptyUserID_ExpectNoWrite(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Now()

	// Act
	err := s.ApplyChat(store.ChatIdentity{
		Platform:    "twitch",
		UserID:      "",
		DisplayName: "Ghost",
	}, defaultActivity(), testDayResetHour, now)

	// Assert
	require.NoError(t, err)
	viewers := listAt(t, s, "", testDayResetHour, now)
	assert.Empty(t, viewers)
}

func TestApplyChat_WhenSameDisplayNameOnTwoPlatforms_ExpectDistinctViewersWithLastSeenIdentity(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 8, 25, 12, 0, 0, 0, time.UTC)

	// Act
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "42", DisplayName: "Alice",
	}, defaultActivity(), testDayResetHour, now))
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "youtube", UserID: "UC1", DisplayName: "Alice",
	}, defaultActivity(), testDayResetHour, now))

	// Assert
	viewers := listAt(t, s, "", testDayResetHour, now)
	require.Len(t, viewers, 2)

	var twitchViewer, youtubeViewer store.Viewer
	for _, viewer := range viewers {
		switch viewer.LastSeen.Platform {
		case "twitch":
			twitchViewer = viewer
		case "youtube":
			youtubeViewer = viewer
		}
	}
	assert.Equal(t, "42", twitchViewer.LastSeen.UserID)
	assert.Equal(t, "UC1", youtubeViewer.LastSeen.UserID)
}

func TestMerge_WhenCrossViewer_ExpectCountersSummedAndSourceHidden(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 8, 25, 12, 0, 0, 0, time.UTC)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "1", DisplayName: "A",
	}, disabledActivity(), testDayResetHour, now))
	_, err := s.ApplyAward(store.ChatIdentity{
		Platform: "twitch", UserID: "1", DisplayName: "A",
	}, 2, testDayResetHour, now)
	require.NoError(t, err)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "youtube", UserID: "2", DisplayName: "B",
	}, disabledActivity(), testDayResetHour, now))
	_, err = s.ApplyAward(store.ChatIdentity{
		Platform: "youtube", UserID: "2", DisplayName: "B",
	}, 3, testDayResetHour, now)
	require.NoError(t, err)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "youtube", UserID: "2", DisplayName: "B",
	}, defaultActivity(), testDayResetHour, now))

	fromID := viewerID(t, s, "twitch", "1", testDayResetHour, now)
	intoID := viewerID(t, s, "youtube", "2", testDayResetHour, now)

	// Act
	err = s.Merge(fromID, intoID, testDayResetHour, now)

	// Assert
	require.NoError(t, err)
	viewers := listAt(t, s, "", testDayResetHour, now)
	require.Len(t, viewers, 1)
	assert.Equal(t, intoID, viewers[0].ID)
	assert.Equal(t, 3, viewers[0].MessageCount)
	assert.Equal(t, 6, viewers[0].XP)

	_, err = s.Get(fromID, testDayResetHour, now)
	assert.ErrorIs(t, err, store.ErrNotFound)

	target := getAt(t, s, intoID, testDayResetHour, now)
	assert.Len(t, target.Identities, 2)
}

func TestMerge_WhenDayResetHourZeroAt0100_ExpectSameDayBucketSummed(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	loc := time.FixedZone("MSK", 3*3600)
	now := time.Date(2026, 8, 25, 1, 0, 0, 0, loc)
	const midnightReset = 0

	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "1", DisplayName: "A",
	}, disabledActivity(), midnightReset, now))
	_, err := s.ApplyAward(store.ChatIdentity{
		Platform: "twitch", UserID: "1", DisplayName: "A",
	}, 2, midnightReset, now)
	require.NoError(t, err)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "youtube", UserID: "2", DisplayName: "B",
	}, disabledActivity(), midnightReset, now))
	_, err = s.ApplyAward(store.ChatIdentity{
		Platform: "youtube", UserID: "2", DisplayName: "B",
	}, 3, midnightReset, now)
	require.NoError(t, err)

	fromID := viewerID(t, s, "twitch", "1", midnightReset, now)
	intoID := viewerID(t, s, "youtube", "2", midnightReset, now)

	beforeMerge := getAt(t, s, intoID, midnightReset, now)
	assert.Equal(t, 1, beforeMerge.DayMessageCount)
	assert.Equal(t, 3, beforeMerge.DayXP)

	// Act
	require.NoError(t, s.Merge(fromID, intoID, midnightReset, now))

	// Assert
	target := getAt(t, s, intoID, midnightReset, now)
	assert.Equal(t, 2, target.MessageCount)
	assert.Equal(t, 5, target.XP)
	assert.Equal(t, 2, target.DayMessageCount)
	assert.Equal(t, 5, target.DayXP)
}

func TestListGet_WhenBeforeResetHour_ExpectPreviousDayBucket(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	loc := time.FixedZone("MSK", 3*3600)
	now := time.Date(2026, 8, 25, 2, 0, 0, 0, loc)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "42", DisplayName: "Alice",
	}, disabledActivity(), testDayResetHour, now))
	_, err := s.ApplyAward(store.ChatIdentity{
		Platform: "twitch", UserID: "42", DisplayName: "Alice",
	}, 4, testDayResetHour, now)
	require.NoError(t, err)

	// Act
	viewer := getAt(t, s, viewerID(t, s, "twitch", "42", testDayResetHour, now), testDayResetHour, now)

	// Assert
	assert.Equal(t, 1, viewer.DayMessageCount)
	assert.Equal(t, 4, viewer.DayXP)
	assert.Equal(t, "2026-08-24", store.DayKey(now, testDayResetHour))
}

func TestMerge_WhenSelfMerge_ExpectError(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Now()
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "42", DisplayName: "Alice",
	}, defaultActivity(), testDayResetHour, now))
	id := viewerID(t, s, "twitch", "42", testDayResetHour, now)

	// Act
	err := s.Merge(id, id, testDayResetHour, now)

	// Assert
	assert.ErrorIs(t, err, store.ErrSelfMerge)
}

func TestDayKey_WhenBeforeResetHour_ExpectPreviousDay(t *testing.T) {
	loc := time.FixedZone("MSK", 3*3600)
	now := time.Date(2026, 8, 25, 5, 30, 0, 0, loc)

	assert.Equal(t, "2026-08-24", store.DayKey(now, 6))
}

func TestDayKey_WhenAfterResetHour_ExpectSameDay(t *testing.T) {
	loc := time.FixedZone("MSK", 3*3600)
	now := time.Date(2026, 8, 25, 6, 30, 0, 0, loc)

	assert.Equal(t, "2026-08-25", store.DayKey(now, 6))
}

func TestStartSession_WhenCalled_ExpectSessionCountersReset(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 8, 25, 12, 0, 0, 0, time.UTC)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "42", DisplayName: "Alice",
	}, disabledActivity(), testDayResetHour, now))
	_, err := s.ApplyAward(store.ChatIdentity{
		Platform: "twitch", UserID: "42", DisplayName: "Alice",
	}, 2, testDayResetHour, now)
	require.NoError(t, err)
	id := viewerID(t, s, "twitch", "42", testDayResetHour, now)
	afterSession := now.Add(time.Hour)

	// Act
	require.NoError(t, s.StartSession(afterSession))

	// Assert
	viewer := getAt(t, s, id, testDayResetHour, afterSession)
	assert.Equal(t, 1, viewer.MessageCount)
	assert.Equal(t, 2, viewer.XP)
	assert.Equal(t, 0, viewer.SessionMessageCount)
	assert.Equal(t, 0, viewer.SessionXP)
	assert.Equal(t, 1, viewer.DayMessageCount)
	assert.Equal(t, 2, viewer.DayXP)
}

func TestUpdateDisplayName_WhenOverrideSetAndCleared_ExpectFallback(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Now()
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "42", DisplayName: "Alice",
	}, defaultActivity(), testDayResetHour, now))
	id := viewerID(t, s, "twitch", "42", testDayResetHour, now)

	// Act
	require.NoError(t, s.UpdateDisplayName(id, "Commander"))
	viewer := getAt(t, s, id, testDayResetHour, now)
	assert.Equal(t, "Commander", viewer.DisplayName)

	require.NoError(t, s.UpdateDisplayName(id, ""))
	viewer = getAt(t, s, id, testDayResetHour, now)

	// Assert
	assert.Equal(t, "Alice", viewer.DisplayName)
}

func TestDBPath_WhenRelativeConfigPath_ExpectDatabaseBesideConfig(t *testing.T) {
	path, err := store.DBPath("config.json")
	require.NoError(t, err)
	assert.Contains(t, path, "comm-relay.db")
}

func viewerID(t *testing.T, s *store.Store, platform, userID string, dayResetHour int, now time.Time) string {
	t.Helper()

	viewers, err := s.List(userID, dayResetHour, now)
	require.NoError(t, err)
	for _, summary := range viewers {
		if summary.LastSeen.Platform == platform && summary.LastSeen.UserID == userID {
			return summary.ID
		}
	}

	require.Fail(t, "viewer identity not found", platform, userID)
	return ""
}

func TestGet_WhenHiddenViewer_ExpectNotFound(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now()
	require.NoError(t, s.ApplyChat(store.ChatIdentity{Platform: "twitch", UserID: "1"}, defaultActivity(), testDayResetHour, now))
	require.NoError(t, s.ApplyChat(store.ChatIdentity{Platform: "youtube", UserID: "2"}, defaultActivity(), testDayResetHour, now))
	fromID := viewerID(t, s, "twitch", "1", testDayResetHour, now)
	intoID := viewerID(t, s, "youtube", "2", testDayResetHour, now)
	require.NoError(t, s.Merge(fromID, intoID, testDayResetHour, now))

	_, err := s.Get(fromID, testDayResetHour, now)
	assert.ErrorIs(t, err, store.ErrNotFound)
}

func TestList_WhenSearchByName_ExpectMatch(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now()
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "42", DisplayName: "Alice",
	}, defaultActivity(), testDayResetHour, now))

	viewers := listAt(t, s, "alice", testDayResetHour, now)
	require.Len(t, viewers, 1)
}

func TestOpenMigrateQuery_WhenIngestAfterUp_ExpectPersistedCounters(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "comm-relay.db")
	s, err := store.Open(path)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, s.Close())
	})

	now := time.Now()
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "99", DisplayName: "Persist",
	}, disabledActivity(), testDayResetHour, now))
	_, err = s.ApplyAward(store.ChatIdentity{
		Platform: "twitch", UserID: "99", DisplayName: "Persist",
	}, 5, testDayResetHour, now)
	require.NoError(t, err)

	s2, err := store.Open(path)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, s2.Close())
	})

	viewers := listAt(t, s2, "persist", testDayResetHour, now)
	require.Len(t, viewers, 1)
	assert.Equal(t, 1, viewers[0].MessageCount)
	assert.Equal(t, 5, viewers[0].XP)
}

func TestApplyChat_WhenZeroPoints_ExpectMessageCountOnly(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now()
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "42", DisplayName: "Alice",
	}, disabledActivity(), testDayResetHour, now))

	viewers := listAt(t, s, "", testDayResetHour, now)
	require.Len(t, viewers, 1)
	assert.Equal(t, 1, viewers[0].MessageCount)
	assert.Equal(t, 0, viewers[0].XP)
}

func TestApplyChat_WhenEmptyPlatform_ExpectNoWrite(t *testing.T) {
	s, _ := openTestStore(t)
	err := s.ApplyChat(store.ChatIdentity{
		Platform: "",
		UserID:   "42",
	}, defaultActivity(), testDayResetHour, time.Now())
	require.NoError(t, err)

	viewers := listAt(t, s, "", testDayResetHour, time.Now())
	assert.Empty(t, viewers)
}

func TestMerge_WhenMissingViewer_ExpectNotFound(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now()
	err := s.Merge("missing-a", "missing-b", testDayResetHour, now)
	assert.ErrorIs(t, err, store.ErrNotFound)
}

func TestGet_WhenMissingViewer_ExpectNotFound(t *testing.T) {
	s, _ := openTestStore(t)
	_, err := s.Get("missing", testDayResetHour, time.Now())
	assert.ErrorIs(t, err, store.ErrNotFound)
}

func TestUpdateDisplayName_WhenMissingViewer_ExpectNotFound(t *testing.T) {
	s, _ := openTestStore(t)
	err := s.UpdateDisplayName("missing", "Name")
	assert.ErrorIs(t, err, store.ErrNotFound)
}

func TestMerge_WhenSelfMerge_ExpectSentinelNotWrapped(t *testing.T) {
	s, _ := openTestStore(t)
	err := s.Merge("same", "same", testDayResetHour, time.Now())
	require.Error(t, err)
	assert.True(t, errors.Is(err, store.ErrSelfMerge))
}
