package store_test

import (
	"context"
	"testing"
	"time"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestLiveEvents_WhenSocialCommandsFire_ExpectOneActionAndStableAttribution(t *testing.T) {
	// Arrange
	s := openSocialTestStore(t)
	seedIdentity(t, s, "twitch", "alice", "alice")
	seedIdentity(t, s, "twitch", "bob", "bob")
	like, err := s.GetCommand("like")
	require.NoError(t, err)
	buff, err := s.GetCommand("buff")
	require.NoError(t, err)
	points := 5
	buff.Points = &points
	now := time.Now()
	_, err = s.GrantAward(store.GrantAwardInput{Identity: store.ChatIdentity{Platform: "twitch", UserID: "bob", DisplayName: "bob"}, AwardID: "spotter", AwardName: "Spotter", Points: 5, Now: now})
	require.NoError(t, err)
	// Act
	for _, command := range []*store.Command{like, buff} {
		result, executeErr := s.ExecuteSocialCommand(store.SocialCommandInput{GiverIdentity: store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"}, Command: *command, Remainder: "bob", MessagePlatform: "twitch", BuffsPerAwardPerViewer: 1, BuffMaxUniqueViewers: 5, Now: now.Add(time.Second)})
		require.NoError(t, executeErr)
		require.Equal(t, "fired", result.Status)
	}
	page, err := s.ListLiveEvents(context.Background(), store.LiveEventsQuery{Category: "reactions"})
	require.NoError(t, err)
	// Assert
	require.Len(t, page.Entries, 3)
	kinds := map[string]int{}
	for _, entry := range page.Entries {
		kinds[entry.Kind]++
		if entry.Kind != "award" {
			assert.Equal(t, "alice", entry.ViewerName)
			assert.Equal(t, "bob", entry.RecipientName)
			assert.Equal(t, 5, entry.Points)
		}
	}
	assert.Equal(t, map[string]int{"award": 1, "like": 1, "buff": 1}, kinds)
	commands, err := s.ListLiveEvents(context.Background(), store.LiveEventsQuery{Category: "commands"})
	require.NoError(t, err)
	assert.Empty(t, commands.Entries)
	// Deleting command definitions cannot resurrect hidden companion rows.
	require.NoError(t, s.DeleteCommand(like.ID))
	commands, err = s.ListLiveEvents(context.Background(), store.LiveEventsQuery{Category: "commands"})
	require.NoError(t, err)
	assert.Empty(t, commands.Entries)
	// Merge must keep both the giver and buff recipient readable.
	seedIdentity(t, s, "youtube", "target", "merged")
	bobID, _ := s.ViewerIDForIdentity("twitch", "bob")
	targetID, _ := s.ViewerIDForIdentity("youtube", "target")
	require.NoError(t, s.Merge(bobID, targetID, 0, now.Add(time.Minute)))
	page, err = s.ListLiveEvents(context.Background(), store.LiveEventsQuery{Category: "reactions"})
	require.NoError(t, err)
	require.Len(t, page.Entries, 3)
	for _, entry := range page.Entries {
		if entry.Kind == "buff" || entry.Kind == "like" {
			assert.NotEmpty(t, entry.RecipientName)
		}
	}
}

func TestLiveEvents_WhenPagingAndRestarting_ExpectStableHistoryAndSessionIsolation(t *testing.T) {
	// Arrange
	s, path := openTestStore(t)
	now := time.Now()
	for range 4 {
		_, err := s.GrantAward(store.GrantAwardInput{Identity: store.ChatIdentity{Platform: "twitch", UserID: "v", DisplayName: "Viewer"}, AwardID: "spotter", AwardName: "Original name", Points: 1, Now: now})
		require.NoError(t, err)
	}
	first, err := s.ListLiveEvents(context.Background(), store.LiveEventsQuery{Category: "reactions", Limit: 2})
	require.NoError(t, err)
	require.Len(t, first.Entries, 2)
	require.NotEmpty(t, first.NextCursor)
	// Act: a second connection reads the same persisted page, then a later event arrives.
	reopened, err := store.Open(path, store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	defer func() { require.NoError(t, reopened.Close()) }()
	recovered, err := reopened.ListLiveEvents(context.Background(), store.LiveEventsQuery{Category: "reactions", Limit: 2})
	require.NoError(t, err)
	assert.Equal(t, first, recovered)
	_, err = s.GrantAward(store.GrantAwardInput{Identity: store.ChatIdentity{Platform: "twitch", UserID: "v"}, AwardID: "spotter", AwardName: "Later", Points: 1, Now: now.Add(time.Minute)})
	require.NoError(t, err)
	next, err := s.ListLiveEvents(context.Background(), store.LiveEventsQuery{Category: "reactions", Limit: 2, Cursor: first.NextCursor})
	require.NoError(t, err)
	require.Len(t, next.Entries, 2)
	assert.Empty(t, next.NextCursor)
	for _, entry := range next.Entries {
		assert.Equal(t, "Original name", entry.Label)
		assert.NotEqual(t, first.Entries[0].ID, entry.ID)
		assert.NotEqual(t, first.Entries[1].ID, entry.ID)
	}
	_, err = s.ListLiveEvents(context.Background(), store.LiveEventsQuery{Category: "commands", Cursor: first.NextCursor})
	assert.ErrorIs(t, err, store.ErrInvalidLiveEventsQuery)
	require.NoError(t, s.StartSession(now.Add(2*time.Minute)))
	empty, err := s.ListLiveEvents(context.Background(), store.LiveEventsQuery{})
	require.NoError(t, err)
	assert.Empty(t, empty.Entries)
	assert.NotEqual(t, first.SessionID, empty.SessionID)
	_, err = s.ListLiveEvents(context.Background(), store.LiveEventsQuery{Category: "reactions", Cursor: first.NextCursor})
	assert.ErrorIs(t, err, store.ErrInvalidLiveEventsQuery)
}

func TestLiveEvents_WhenProgressionAndSilentActivity_ExpectLiveProgressOnly(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now()
	_, err := s.CreateProgressionLevel(store.CreateProgressionLevelInput{ID: "small", Title: "New level", MinXP: 3, Now: now})
	require.NoError(t, err)
	_, err = s.CreateAchievement(store.CreateAchievementInput{ID: "live_award", Name: "Live achievement", Enabled: true, Metric: store.ProgressionMetricXP, Target: 3, Now: now})
	require.NoError(t, err)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "p", DisplayName: "Progress"}
	award, err := s.GrantAward(store.GrantAwardInput{Identity: identity, AwardID: "spotter", AwardName: "Spotter", Points: 3, Now: now})
	require.NoError(t, err)
	// A retrospective unlock must never appear as live.
	_, err = s.CreateAchievement(store.CreateAchievementInput{ID: "backfill", Name: "Backfilled", Enabled: true, Metric: store.ProgressionMetricXP, Target: 1, Now: now})
	require.NoError(t, err)
	_, err = s.EvaluateProgression(store.ProgressionEvaluationInput{ViewerID: award.ViewerID, CauseMetric: store.ProgressionMetricXP, Backfilled: true, Now: now})
	require.NoError(t, err)
	page, err := s.ListLiveEvents(context.Background(), store.LiveEventsQuery{Category: "progress"})
	require.NoError(t, err)
	labels := []string{}
	for _, entry := range page.Entries {
		labels = append(labels, entry.Label)
	}
	assert.Contains(t, labels, "New level")
	assert.Contains(t, labels, "Live achievement")
	assert.NotContains(t, labels, "Backfilled")
	require.NoError(t, s.AppendInteractionEvent(store.AppendInteractionEventInput{Kind: store.InteractionEventActivity, ViewerID: award.ViewerID, Points: 1, Now: now}))
	all, err := s.ListLiveEvents(context.Background(), store.LiveEventsQuery{})
	require.NoError(t, err)
	for _, entry := range all.Entries {
		assert.NotEqual(t, "activity", entry.Kind)
	}
}

func TestLiveEvents_WhenTransactionFails_ExpectNoPhantomRows(t *testing.T) {
	s, _ := openTestStore(t)
	s.SetInteractionEventInsertHookForTest(func() error { return errors.New("injected") })
	_, err := s.GrantAward(store.GrantAwardInput{Identity: store.ChatIdentity{Platform: "twitch", UserID: "fail"}, AwardID: "spotter", AwardName: "Spotter", Points: 1000, Now: time.Now()})
	require.Error(t, err)
	page, err := s.ListLiveEvents(context.Background(), store.LiveEventsQuery{})
	require.NoError(t, err)
	assert.Empty(t, page.Entries)
}
