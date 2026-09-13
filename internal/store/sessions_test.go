package store_test

import (
	"fmt"
	"testing"
	"time"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestListSessions_WhenMultipleSessionsExist_ExpectNewestFirstStableCursor(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now().UTC().Truncate(time.Second)
	require.NoError(t, s.StartSession(now))
	require.NoError(t, s.StartSession(now.Add(time.Minute)))
	require.NoError(t, s.StartSession(now.Add(2*time.Minute)))
	currentSessionID, err := s.CurrentSessionID()
	require.NoError(t, err)

	page, err := s.ListSessions(store.SessionsQuery{Limit: 2})
	require.NoError(t, err)
	require.Len(t, page.Sessions, 2)
	assert.Equal(t, currentSessionID, page.Sessions[0].ID)
	assert.True(t, page.Sessions[0].IsCurrent)
	assert.True(t, page.Sessions[0].StartedAt.After(page.Sessions[1].StartedAt) ||
		(page.Sessions[0].StartedAt.Equal(page.Sessions[1].StartedAt) && page.Sessions[0].ID > page.Sessions[1].ID))
	assert.NotEmpty(t, page.NextCursor)

	seen := map[string]struct{}{page.Sessions[0].ID: {}, page.Sessions[1].ID: {}}
	nextPage, err := s.ListSessions(store.SessionsQuery{Limit: 2, Cursor: page.NextCursor})
	require.NoError(t, err)
	for _, summary := range nextPage.Sessions {
		assert.NotContains(t, seen, summary.ID)
		seen[summary.ID] = struct{}{}
	}
	all, err := s.ListSessions(store.SessionsQuery{Limit: 50})
	require.NoError(t, err)
	assert.Len(t, seen, len(all.Sessions))
}

func TestGetSession_WhenPriorSessionSelectedAfterNewStream_ExpectPriorStats(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now().UTC().Truncate(time.Second)
	require.NoError(t, s.StartSession(now))
	firstSessionID, err := s.CurrentSessionID()
	require.NoError(t, err)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "prior", DisplayName: "Prior"}
	require.NoError(t, s.ApplyChat(identity, store.ActivitySettings{IntervalSeconds: 0, SessionLimit: 0, XP: 1}, testDayResetHour, now))
	require.NoError(t, s.StartSession(now.Add(time.Minute)))
	secondSessionID, err := s.CurrentSessionID()
	require.NoError(t, err)
	assert.NotEqual(t, firstSessionID, secondSessionID)
	require.NoError(t, s.ApplyChat(identity, store.ActivitySettings{IntervalSeconds: 0, SessionLimit: 0, XP: 1}, testDayResetHour, now.Add(2*time.Minute)))

	prior, err := s.GetSession(firstSessionID, false)
	require.NoError(t, err)
	current, err := s.GetSession(secondSessionID, false)
	require.NoError(t, err)
	_, err = s.GetSession("", false)
	require.Error(t, err)
	assert.True(t, errors.Is(err, store.ErrSessionNotFound))
	assert.Equal(t, 1, prior.Totals.MessageCount)
	assert.Equal(t, 1, current.Totals.MessageCount)
}

func TestGetSession_WhenRankingAndGroupsSeeded_ExpectTopFiveAndSixGroupsOrdering(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 12, 12, 0, 0, 0, time.UTC)
	sessionID, err := s.CurrentSessionID()
	require.NoError(t, err)

	for i := 1; i <= 6; i++ {
		identity := store.ChatIdentity{Platform: "twitch", UserID: fmt.Sprintf("rank%d", i), DisplayName: fmt.Sprintf("Rank%d", i)}
		for range i {
			require.NoError(t, s.ApplyChat(identity, store.ActivitySettings{IntervalSeconds: 0, SessionLimit: 0, XP: 1}, testDayResetHour, now.Add(time.Duration(i)*time.Second)))
		}
	}

	_, err = s.CreateAchievement(store.CreateAchievementInput{ID: "announce_on", Name: "Announce", Enabled: true, Announce: true, Metric: store.ProgressionMetricMessageCount, Target: 1, Now: now})
	require.NoError(t, err)
	_, err = s.CreateAchievement(store.CreateAchievementInput{ID: "announce_off", Name: "Hidden", Enabled: true, Announce: false, Metric: store.ProgressionMetricMessageCount, Target: 1, Now: now})
	require.NoError(t, err)

	for i := 1; i <= 7; i++ {
		identity := store.ChatIdentity{Platform: "twitch", UserID: fmt.Sprintf("ach%d", i), DisplayName: fmt.Sprintf("Ach%d", i)}
		require.NoError(t, s.ApplyChat(identity, store.ActivitySettings{IntervalSeconds: 0, SessionLimit: 0, XP: 0}, testDayResetHour, now.Add(time.Duration(10+i)*time.Second)))
		viewerID, known := s.ViewerIDForIdentity("twitch", identity.UserID)
		require.True(t, known)
		_, err = s.EvaluateProgression(store.ProgressionEvaluationInput{ViewerID: viewerID, CauseMetric: store.ProgressionMetricMessageCount, Now: now.Add(time.Duration(10+i) * time.Second)})
		require.NoError(t, err)
	}

	detail, err := s.GetSession(sessionID, false)
	require.NoError(t, err)
	assert.Len(t, detail.Ranking, 5)
	assert.Equal(t, 1, detail.Ranking[0].Rank)
	assert.GreaterOrEqual(t, detail.Ranking[0].XP, detail.Ranking[1].XP)
	assert.Len(t, detail.AchievementGroups, 6)
}

func TestGetSession_WhenPrivacyFlagsSet_ExpectExcludedFromRankingAndGroups(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 12, 12, 0, 0, 0, time.UTC)
	sessionID, err := s.CurrentSessionID()
	require.NoError(t, err)

	hiddenIdentity := store.ChatIdentity{Platform: "twitch", UserID: "hidden", DisplayName: "Hidden"}
	publicIdentity := store.ChatIdentity{Platform: "twitch", UserID: "public", DisplayName: "Public"}
	optOutIdentity := store.ChatIdentity{Platform: "twitch", UserID: "optout", DisplayName: "OptOut"}
	for range 10 {
		require.NoError(t, s.ApplyChat(hiddenIdentity, disabledActivity(), testDayResetHour, now))
	}
	require.NoError(t, s.ApplyChat(publicIdentity, disabledActivity(), testDayResetHour, now))
	require.NoError(t, s.ApplyChat(optOutIdentity, disabledActivity(), testDayResetHour, now))
	_, err = s.ApplyAward(hiddenIdentity, 10, testDayResetHour, now)
	require.NoError(t, err)
	_, err = s.ApplyAward(publicIdentity, 1, testDayResetHour, now)
	require.NoError(t, err)

	hiddenID, _ := s.ViewerIDForIdentity("twitch", "hidden")
	publicID, _ := s.ViewerIDForIdentity("twitch", "public")
	optOutID, _ := s.ViewerIDForIdentity("twitch", "optout")
	require.NoError(t, s.UpdateLeaderboardHidden(hiddenID, true))
	require.NoError(t, s.UpdateProgressionAlertsDisabled(optOutID, true))

	_, err = s.CreateAchievement(store.CreateAchievementInput{ID: "announce_on", Name: "Announce", Enabled: true, Announce: true, Metric: store.ProgressionMetricMessageCount, Target: 1, Now: now})
	require.NoError(t, err)
	_, err = s.CreateAchievement(store.CreateAchievementInput{ID: "announce_off", Name: "Silent", Enabled: true, Announce: false, Metric: store.ProgressionMetricMessageCount, Target: 1, Now: now})
	require.NoError(t, err)
	_, err = s.EvaluateProgression(store.ProgressionEvaluationInput{ViewerID: publicID, CauseMetric: store.ProgressionMetricMessageCount, Now: now})
	require.NoError(t, err)
	_, err = s.EvaluateProgression(store.ProgressionEvaluationInput{ViewerID: optOutID, CauseMetric: store.ProgressionMetricMessageCount, Now: now})
	require.NoError(t, err)
	_, err = s.InsertAchievementUnlock(store.InsertAchievementUnlockInput{
		ViewerID: publicID, AchievementID: "announce_off", Revision: 1, Occurrence: 1, ProgressValue: 1, Name: "Silent", Backfilled: false, UnlockedAt: now,
	})
	require.NoError(t, err)
	_, err = s.InsertAchievementUnlock(store.InsertAchievementUnlockInput{
		ViewerID: publicID, AchievementID: "announce_on", Revision: 1, Occurrence: 1, ProgressValue: 1, Name: "Announce", Backfilled: true, UnlockedAt: now,
	})
	require.NoError(t, err)

	detail, err := s.GetSession(sessionID, false)
	require.NoError(t, err)
	for _, entry := range detail.Ranking {
		assert.NotEqual(t, "Hidden", entry.DisplayName)
	}
	for _, group := range detail.AchievementGroups {
		assert.NotEqual(t, "OptOut", group.ViewerDisplayName)
		assert.NotEqual(t, "Silent", group.Name)
	}
	var foundAnnounce bool
	for _, group := range detail.AchievementGroups {
		if group.Name == "Announce" {
			foundAnnounce = true
		}
	}
	assert.True(t, foundAnnounce)
}

func TestGetSession_WhenEmptySession_ExpectZeroTotalsAndEmptySections(t *testing.T) {
	s, _ := openTestStore(t)
	sessionID, err := s.CurrentSessionID()
	require.NoError(t, err)

	detail, err := s.GetSession(sessionID, false)
	require.NoError(t, err)
	assert.Zero(t, detail.Totals.ViewerCount)
	assert.Zero(t, detail.Totals.MessageCount)
	assert.Zero(t, detail.Totals.XP)
	assert.Empty(t, detail.Ranking)
	assert.Empty(t, detail.AchievementGroups)
}

func TestGetSession_WhenMissingID_ExpectNotFound(t *testing.T) {
	s, _ := openTestStore(t)
	_, err := s.GetSession("missing-session", false)
	require.Error(t, err)
	assert.True(t, errors.Is(err, store.ErrSessionNotFound))
}

func TestInteractionEvents_WhenLivePathsRun_ExpectOpenSessionAttribution(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 12, 12, 0, 0, 0, time.UTC)
	sessionID, err := s.CurrentSessionID()
	require.NoError(t, err)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "live", DisplayName: "Live"}
	require.NoError(t, s.ApplyChat(identity, store.ActivitySettings{IntervalSeconds: 1, SessionLimit: 10, XP: 1}, testDayResetHour, now.Add(2*time.Second)))
	viewerID, known := s.ViewerIDForIdentity("twitch", "live")
	require.True(t, known)

	command, err := s.CreateCommand(store.CreateCommandInput{ID: "live_cmd", Trigger: "livecmd", Enabled: true, SplashTemplate: "{viewer}", DurationMs: 3000})
	require.NoError(t, err)
	require.NoError(t, s.AppendInteractionEvent(store.AppendInteractionEventInput{
		Kind: store.InteractionEventCommand, ViewerID: viewerID, CommandID: command.ID, CommandTrigger: command.Trigger, Now: now,
	}))
	award, err := s.GrantAward(store.GrantAwardInput{Identity: identity, AwardID: "spotter", AwardName: "Spotter", Points: 5, DayResetHour: testDayResetHour, Now: now})
	require.NoError(t, err)

	events, err := s.ListInteractionEventsByViewer(viewerID)
	require.NoError(t, err)
	for _, event := range events {
		assert.Equal(t, sessionID, event.SessionID)
	}
	assert.Equal(t, award.ViewerID, viewerID)
}

func TestAchievementUnlocks_WhenLiveAndReconciled_ExpectSessionAttributionRules(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 12, 12, 0, 0, 0, time.UTC)
	sessionID, err := s.CurrentSessionID()
	require.NoError(t, err)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "unlock", DisplayName: "Unlock"}
	require.NoError(t, s.ApplyChat(identity, store.ActivitySettings{}, testDayResetHour, now))
	viewerID, known := s.ViewerIDForIdentity("twitch", "unlock")
	require.True(t, known)
	_, err = s.CreateAchievement(store.CreateAchievementInput{ID: "live_unlock", Name: "Live", Enabled: true, Metric: store.ProgressionMetricMessageCount, Target: 1, Now: now})
	require.NoError(t, err)

	liveResult, err := s.EvaluateProgression(store.ProgressionEvaluationInput{ViewerID: viewerID, CauseMetric: store.ProgressionMetricMessageCount, Now: now})
	require.NoError(t, err)
	require.Len(t, liveResult.Unlocks, 1)
	assert.Equal(t, sessionID, liveResult.Unlocks[0].SessionID)

	backfillResult, err := s.EvaluateProgression(store.ProgressionEvaluationInput{ViewerID: viewerID, CauseMetric: store.ProgressionMetricXP, Backfilled: true, Now: now})
	require.NoError(t, err)
	for _, unlock := range backfillResult.Unlocks {
		assert.Empty(t, unlock.SessionID)
	}
}

func TestMerge_WhenHistoricalSessionsOverlap_ExpectPreservedEventAndUnlockAttribution(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Now().UTC().Truncate(time.Second)
	require.NoError(t, s.StartSession(now))
	from := store.ChatIdentity{Platform: "twitch", UserID: "merge-from", DisplayName: "From"}
	into := store.ChatIdentity{Platform: "youtube", UserID: "merge-into", DisplayName: "Into"}
	require.NoError(t, s.ApplyChat(from, store.ActivitySettings{}, testDayResetHour, now))
	firstSessionID, err := s.CurrentSessionID()
	require.NoError(t, err)
	fromID, _ := s.ViewerIDForIdentity("twitch", "merge-from")
	command, err := s.CreateCommand(store.CreateCommandInput{ID: "merge_cmd", Trigger: "mergecmd", Enabled: true, SplashTemplate: "{viewer}", DurationMs: 3000})
	require.NoError(t, err)
	require.NoError(t, s.AppendInteractionEvent(store.AppendInteractionEventInput{
		Kind: store.InteractionEventCommand, ViewerID: fromID, CommandID: command.ID, CommandTrigger: command.Trigger, Now: now,
	}))
	require.NoError(t, s.StartSession(now.Add(time.Minute)))
	secondSessionID, err := s.CurrentSessionID()
	require.NoError(t, err)
	require.NoError(t, s.ApplyChat(from, store.ActivitySettings{}, testDayResetHour, now.Add(2*time.Minute)))
	require.NoError(t, s.ApplyChat(into, store.ActivitySettings{}, testDayResetHour, now.Add(2*time.Minute)))
	intoID, _ := s.ViewerIDForIdentity("youtube", "merge-into")

	_, err = s.CreateAchievement(store.CreateAchievementInput{ID: "merge_ach", Name: "Merge", Enabled: true, Metric: store.ProgressionMetricMessageCount, Target: 1, Now: now})
	require.NoError(t, err)
	early := now.Add(3 * time.Minute)
	late := now.Add(4 * time.Minute)
	_, err = s.InsertAchievementUnlock(store.InsertAchievementUnlockInput{
		ViewerID: fromID, SessionID: firstSessionID, AchievementID: "merge_ach", Revision: 1, Occurrence: 1,
		ProgressValue: 1, Name: "Merge", UnlockedAt: early,
	})
	require.NoError(t, err)
	_, err = s.InsertAchievementUnlock(store.InsertAchievementUnlockInput{
		ViewerID: intoID, SessionID: secondSessionID, AchievementID: "merge_ach", Revision: 1, Occurrence: 1,
		ProgressValue: 1, Name: "Merge", UnlockedAt: late,
	})
	require.NoError(t, err)

	require.NoError(t, s.Merge(fromID, intoID, testDayResetHour, now.Add(5*time.Minute)))

	events, err := s.ListInteractionEventsByViewer(intoID)
	require.NoError(t, err)
	require.Len(t, events, 1)
	assert.Equal(t, firstSessionID, events[0].SessionID)

	unlocks, err := s.ListAchievementUnlocks(intoID)
	require.NoError(t, err)
	var merged *store.AchievementUnlock
	for _, unlock := range unlocks {
		if unlock.AchievementID == "merge_ach" {
			merged = &unlock
			break
		}
	}
	require.NotNil(t, merged)
	assert.Equal(t, firstSessionID, merged.SessionID)
	assert.True(t, merged.UnlockedAt.Equal(early.UTC()) || merged.UnlockedAt.Equal(early))
}

func TestListSessions_WhenInvalidCursorOrLimit_ExpectValidationError(t *testing.T) {
	s, _ := openTestStore(t)
	_, err := s.ListSessions(store.SessionsQuery{Limit: 0})
	require.NoError(t, err)
	_, err = s.ListSessions(store.SessionsQuery{Limit: 51})
	require.Error(t, err)
	assert.True(t, errors.Is(err, store.ErrInvalidSessionListLimit))
	_, err = s.ListSessions(store.SessionsQuery{Cursor: "not-a-cursor"})
	require.Error(t, err)
	assert.True(t, errors.Is(err, store.ErrInvalidSessionCursor))
}
