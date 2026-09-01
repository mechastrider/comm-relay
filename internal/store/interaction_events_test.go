package store_test

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestAppendInteractionEvent_WhenCommandFire_ExpectListedByViewer(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 8, 29, 12, 0, 0, 0, time.UTC)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform:    "twitch",
		UserID:      "42",
		DisplayName: "Alice",
	}, 1, testDayResetHour, now))
	viewerID := viewerID(t, s, "twitch", "42", testDayResetHour, now)

	// Act
	err := s.AppendInteractionEvent(store.AppendInteractionEventInput{
		Kind:           store.InteractionEventCommand,
		ViewerID:       viewerID,
		CommandTrigger: "gg",
		Now:            now,
	})

	// Assert
	require.NoError(t, err)
	events, err := s.ListInteractionEventsByViewer(viewerID)
	require.NoError(t, err)
	require.Len(t, events, 1)
	assert.Equal(t, store.InteractionEventCommand, events[0].Kind)
	assert.Equal(t, viewerID, events[0].ViewerID)
	assert.Equal(t, "gg", events[0].CommandTrigger)
	assert.Equal(t, 0, events[0].Points)
	assert.Empty(t, events[0].AwardID)
	assert.Empty(t, events[0].MessagePlatform)
	assert.Empty(t, events[0].MessageID)
}

func TestAppendInteractionEvent_WhenAdviceGrant_ExpectAwardEvent(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 8, 29, 12, 0, 0, 0, time.UTC)
	result, err := s.ApplyAward(store.ChatIdentity{
		Platform:    "twitch",
		UserID:      "42",
		DisplayName: "Alice",
	}, 50, testDayResetHour, now)
	require.NoError(t, err)

	// Act
	err = s.AppendInteractionEvent(store.AppendInteractionEventInput{
		Kind:     store.InteractionEventAward,
		ViewerID: result.ViewerID,
		AwardID:  "advice",
		Points:   50,
		Now:      now,
	})

	// Assert
	require.NoError(t, err)
	events, err := s.ListInteractionEventsByViewer(result.ViewerID)
	require.NoError(t, err)
	require.Len(t, events, 1)
	assert.Equal(t, store.InteractionEventAward, events[0].Kind)
	assert.Equal(t, "advice", events[0].AwardID)
	assert.Equal(t, 50, events[0].Points)
}

func TestMerge_WhenAwardEventsExist_ExpectViewerIDRewritten(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 8, 29, 12, 0, 0, 0, time.UTC)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "twitch", UserID: "1", DisplayName: "A",
	}, 1, testDayResetHour, now))
	require.NoError(t, s.ApplyChat(store.ChatIdentity{
		Platform: "youtube", UserID: "2", DisplayName: "B",
	}, 1, testDayResetHour, now))

	fromID := viewerID(t, s, "twitch", "1", testDayResetHour, now)
	intoID := viewerID(t, s, "youtube", "2", testDayResetHour, now)

	require.NoError(t, s.AppendInteractionEvent(store.AppendInteractionEventInput{
		Kind:     store.InteractionEventAward,
		ViewerID: fromID,
		AwardID:  "joke",
		Points:   10,
		Now:      now,
	}))
	require.NoError(t, s.AppendInteractionEvent(store.AppendInteractionEventInput{
		Kind:           store.InteractionEventCommand,
		ViewerID:       fromID,
		CommandTrigger: "gg",
		Now:            now,
	}))

	// Act
	require.NoError(t, s.Merge(fromID, intoID, testDayResetHour, now))

	// Assert
	fromEvents, err := s.ListInteractionEventsByViewer(fromID)
	require.NoError(t, err)
	assert.Empty(t, fromEvents)

	intoEvents, err := s.ListInteractionEventsByViewer(intoID)
	require.NoError(t, err)
	require.Len(t, intoEvents, 2)
	assert.Equal(t, store.InteractionEventAward, intoEvents[0].Kind)
	assert.Equal(t, "joke", intoEvents[0].AwardID)
	assert.Equal(t, store.InteractionEventCommand, intoEvents[1].Kind)
	assert.Equal(t, "gg", intoEvents[1].CommandTrigger)
}

func TestInteractionEvents_WhenReopenDatabase_ExpectAwardEventPersists(t *testing.T) {
	// Arrange
	dir := t.TempDir()
	path := filepath.Join(dir, "comm-relay.db")
	now := time.Date(2026, 8, 29, 12, 0, 0, 0, time.UTC)

	s, err := store.Open(path)
	require.NoError(t, err)
	result, err := s.ApplyAward(store.ChatIdentity{
		Platform: "twitch",
		UserID:   "42",
	}, 50, testDayResetHour, now)
	require.NoError(t, err)
	require.NoError(t, s.AppendInteractionEvent(store.AppendInteractionEventInput{
		Kind:     store.InteractionEventAward,
		ViewerID: result.ViewerID,
		AwardID:  "advice",
		Points:   50,
		Now:      now,
	}))
	require.NoError(t, s.Close())

	// Act
	reopened, err := store.Open(path)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, reopened.Close())
	})

	// Assert
	events, err := reopened.ListInteractionEventsByViewer(result.ViewerID)
	require.NoError(t, err)
	require.Len(t, events, 1)
	assert.Equal(t, store.InteractionEventAward, events[0].Kind)
	assert.Equal(t, "advice", events[0].AwardID)
	assert.Equal(t, 50, events[0].Points)

	info, err := os.Stat(path)
	require.NoError(t, err)
	assert.False(t, info.IsDir())
}

func TestInteractionEventSchema_WhenInspected_ExpectNoMessageBodyColumn(t *testing.T) {
	// Arrange
	dir := t.TempDir()
	path := filepath.Join(dir, "comm-relay.db")
	s, err := store.Open(path)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, s.Close())
	})

	// Act
	rows, err := s.QueryInteractionEventColumns()
	require.NoError(t, err)

	// Assert
	assert.ElementsMatch(t, []string{
		"id",
		"kind",
		"viewer_id",
		"command_trigger",
		"award_id",
		"points",
		"message_platform",
		"message_id",
		"created_at",
	}, rows)
}
