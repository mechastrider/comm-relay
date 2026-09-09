package store_test

import (
	"sync"
	"testing"
	"time"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestViewerContract_WhenOpenedAndCatalogChanges_ExpectSnapshotSurvivesRestart(t *testing.T) {
	// Arrange
	s, path := openTestStore(t)
	now := time.Date(2026, 9, 8, 12, 0, 0, 0, time.UTC)

	// Act
	contract, err := s.OpenViewerContract(store.OpenViewerContractInput{
		Title: "  Find \U0001F4A1  ", Objective: "  Mark the hidden cache.  ", RewardID: "joke", Now: now,
	})
	require.NoError(t, err)
	_, err = s.UpdateAward(store.UpdateAwardInput{
		ID: "joke", Name: "Changed", Points: 99, SplashTemplate: "Changed", Sound: "chime", DurationMs: 1,
	})
	require.NoError(t, err)
	require.NoError(t, s.DeleteAward("joke"))
	require.NoError(t, s.Close())
	reopened, err := store.Open(path, store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, reopened.Close()) })
	current, err := reopened.CurrentViewerContract()

	// Assert
	require.NoError(t, err)
	assert.Equal(t, contract.ID, current.ID)
	assert.Equal(t, "Find \U0001F4A1", current.Title)
	assert.Equal(t, "Mark the hidden cache.", current.Objective)
	assert.Equal(t, "joke", current.RewardID)
	assert.Equal(t, "Joke", current.RewardName)
	assert.Equal(t, 10, current.RewardPoints)
	assert.Equal(t, now, current.AnnouncedAt)
}

func TestViewerContract_WhenConcurrentOpen_ExpectOneActiveContract(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	var wg sync.WaitGroup
	results := make(chan error, 2)

	// Act
	for range 2 {
		wg.Go(func() {
			_, err := s.OpenViewerContract(store.OpenViewerContractInput{
				Title: "Find cache", Objective: "Mark it", RewardID: "joke", Now: time.Now(),
			})
			results <- err
		})
	}
	wg.Wait()
	close(results)

	// Assert
	var success, conflicts int
	for err := range results {
		if err == nil {
			success++
			continue
		}
		if errors.Is(err, store.ErrViewerContractConflict) {
			conflicts++
		}
	}
	assert.Equal(t, 1, success)
	assert.Equal(t, 1, conflicts)
}

func TestViewerContract_WhenInvalidOrStale_ExpectTypedErrors(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)

	// Act / Assert
	_, err := s.OpenViewerContract(store.OpenViewerContractInput{
		Title: " ", Objective: "Objective", RewardID: "joke",
	})
	require.ErrorIs(t, err, store.ErrInvalidViewerContract)
	_, err = s.OpenViewerContract(store.OpenViewerContractInput{
		Title: string(make([]rune, 81)), Objective: "Objective", RewardID: "joke",
	})
	require.ErrorIs(t, err, store.ErrInvalidViewerContract)
	_, err = s.CurrentViewerContract()
	require.ErrorIs(t, err, store.ErrViewerContractNotFound)
	_, err = s.ActiveViewerContract("stale")
	require.ErrorIs(t, err, store.ErrViewerContractConflict)
}

func TestViewerContract_WhenAwarded_ExpectAtomicXPAndAwardEventFromSnapshot(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 8, 12, 0, 0, 0, time.UTC)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{Platform: "youtube", UserID: "UC1", DisplayName: "Alice"}, defaultActivity(), testDayResetHour, now))
	viewerID := viewerID(t, s, "youtube", "UC1", testDayResetHour, now)
	contract, err := s.OpenViewerContract(store.OpenViewerContractInput{Title: "Find loot", Objective: "Mark it", RewardID: "joke", Now: now})
	require.NoError(t, err)
	require.NoError(t, s.DeleteAward("joke"))

	// Act
	result, err := s.AwardViewerContract(store.AwardViewerContractInput{
		ID: contract.ID, ViewerID: viewerID, DayResetHour: testDayResetHour, CustomAvatarsEnabled: true, Now: now.Add(time.Minute),
	})

	// Assert
	require.NoError(t, err)
	assert.Equal(t, store.ViewerContractAwarded, result.Contract.Status)
	assert.Equal(t, viewerID, result.ViewerID)
	assert.Equal(t, "Alice", result.ViewerDisplayName)
	assert.Equal(t, 10, result.Contract.RewardPoints)
	_, err = s.CurrentViewerContract()
	require.ErrorIs(t, err, store.ErrViewerContractNotFound)
	viewer := getAt(t, s, viewerID, testDayResetHour, now.Add(time.Minute))
	assert.Equal(t, 11, viewer.XP)
	assert.Equal(t, 11, viewer.SessionXP)
	assert.Equal(t, 11, viewer.DayXP)
	events, err := s.ListInteractionEventsByViewer(viewerID)
	require.NoError(t, err)
	var awardEvent *store.InteractionEvent
	for index := range events {
		if events[index].Kind == store.InteractionEventAward {
			awardEvent = &events[index]
		}
	}
	require.NotNil(t, awardEvent)
	assert.Equal(t, contract.ID, awardEvent.ContractID)
	assert.Equal(t, "joke", awardEvent.AwardID)
	assert.Equal(t, "Joke", awardEvent.AwardName)
	assert.Equal(t, 10, awardEvent.Points)
}

func TestViewerContract_WhenAwardFailsOrWinnerHidden_ExpectActiveWithoutPartialWrite(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 8, 12, 0, 0, 0, time.UTC)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{Platform: "twitch", UserID: "source", DisplayName: "Source"}, defaultActivity(), testDayResetHour, now))
	require.NoError(t, s.ApplyChat(store.ChatIdentity{Platform: "vk", UserID: "target", DisplayName: "Target"}, defaultActivity(), testDayResetHour, now))
	sourceID := viewerID(t, s, "twitch", "source", testDayResetHour, now)
	targetID := viewerID(t, s, "vk", "target", testDayResetHour, now)
	require.NoError(t, s.Merge(sourceID, targetID, testDayResetHour, now))
	contract, err := s.OpenViewerContract(store.OpenViewerContractInput{Title: "Find loot", Objective: "Mark it", RewardID: "joke", Now: now})
	require.NoError(t, err)

	// Act / Assert: hidden merge sources cannot settle the contract.
	_, err = s.AwardViewerContract(store.AwardViewerContractInput{ID: contract.ID, ViewerID: sourceID, DayResetHour: testDayResetHour, Now: now.Add(time.Minute)})
	require.ErrorIs(t, err, store.ErrNotFound)
	current, err := s.CurrentViewerContract()
	require.NoError(t, err)
	require.Equal(t, contract.ID, current.ID)
	eventsBefore, err := s.CountInteractionEvents()
	require.NoError(t, err)
	viewerBefore := getAt(t, s, targetID, testDayResetHour, now.Add(time.Minute))

	// Act / Assert: an injected event failure rolls back XP and the transition.
	s.SetInteractionEventInsertHookForTest(func() error { return errors.New("event failure") })
	t.Cleanup(func() { s.SetInteractionEventInsertHookForTest(nil) })
	_, err = s.AwardViewerContract(store.AwardViewerContractInput{ID: contract.ID, ViewerID: targetID, DayResetHour: testDayResetHour, Now: now.Add(2 * time.Minute)})
	require.Error(t, err)
	current, err = s.CurrentViewerContract()
	require.NoError(t, err)
	assert.Equal(t, contract.ID, current.ID)
	viewer := getAt(t, s, targetID, testDayResetHour, now.Add(2*time.Minute))
	assert.Equal(t, viewerBefore.XP, viewer.XP)
	count, err := s.CountInteractionEvents()
	require.NoError(t, err)
	assert.Equal(t, eventsBefore, count)
}

func TestViewerContract_WhenCloseRacesAward_ExpectExactlyOneTerminalTransition(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 8, 12, 0, 0, 0, time.UTC)
	require.NoError(t, s.ApplyChat(store.ChatIdentity{Platform: "twitch", UserID: "42", DisplayName: "Alice"}, defaultActivity(), testDayResetHour, now))
	viewerID := viewerID(t, s, "twitch", "42", testDayResetHour, now)
	contract, err := s.OpenViewerContract(store.OpenViewerContractInput{Title: "Find loot", Objective: "Mark it", RewardID: "joke", Now: now})
	require.NoError(t, err)
	results := make(chan error, 2)
	var wg sync.WaitGroup

	// Act
	wg.Go(func() {
		_, awardErr := s.AwardViewerContract(store.AwardViewerContractInput{ID: contract.ID, ViewerID: viewerID, DayResetHour: testDayResetHour, Now: now.Add(time.Minute)})
		results <- awardErr
	})
	wg.Go(func() {
		_, closeErr := s.CloseViewerContract(contract.ID, now.Add(time.Minute))
		results <- closeErr
	})
	wg.Wait()
	close(results)

	// Assert
	var success, conflicts int
	for result := range results {
		if result == nil {
			success++
		} else if errors.Is(result, store.ErrViewerContractConflict) {
			conflicts++
		}
	}
	assert.Equal(t, 1, success)
	assert.Equal(t, 1, conflicts)
	_, err = s.CurrentViewerContract()
	require.ErrorIs(t, err, store.ErrViewerContractNotFound)
}

func TestViewerContract_WhenClosedWithoutResult_ExpectNoXPOrHistory(t *testing.T) {
	// Arrange
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 8, 12, 0, 0, 0, time.UTC)
	contract, err := s.OpenViewerContract(store.OpenViewerContractInput{Title: "Find loot", Objective: "Mark it", RewardID: "joke", Now: now})
	require.NoError(t, err)

	// Act
	closed, err := s.CloseViewerContract(contract.ID, now.Add(time.Minute))

	// Assert
	require.NoError(t, err)
	assert.Equal(t, store.ViewerContractClosed, closed.Status)
	count, err := s.CountInteractionEvents()
	require.NoError(t, err)
	assert.Zero(t, count)
	history, err := s.ListRewardHistory(store.RewardHistoryQuery{})
	require.NoError(t, err)
	assert.Empty(t, history.Entries)
	_, err = s.CloseViewerContract(contract.ID, now.Add(2*time.Minute))
	require.ErrorIs(t, err, store.ErrViewerContractConflict)
}
