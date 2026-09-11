package store_test

import (
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestGreetings_WhenFreshStore_ExpectTwoDisabledLocalizedDefinitions(t *testing.T) {
	t.Parallel()
	english, _ := openTestStore(t)
	greetings, err := english.ListGreetings()
	require.NoError(t, err)
	require.Len(t, greetings, 2)
	assert.Equal(t, store.GreetingNewViewer, greetings[0].ID)
	assert.False(t, greetings[0].Enabled)
	assert.Equal(t, "Welcome, {viewer}!", greetings[0].SplashTemplate)
	assert.Equal(t, store.GreetingReturningViewer, greetings[1].ID)
	assert.False(t, greetings[1].Enabled)
}

func TestGreetings_WhenOrdinaryLineThenNewSession_ExpectNewThenReturning(t *testing.T) {
	t.Parallel()
	s, _ := openTestStore(t)
	for _, kind := range []store.GreetingKind{store.GreetingNewViewer, store.GreetingReturningViewer} {
		greeting, err := s.GetGreeting(kind)
		require.NoError(t, err)
		greeting.Enabled = true
		_, err = s.UpdateGreeting(*greeting)
		require.NoError(t, err)
	}
	now := time.Date(2026, 9, 11, 12, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "42", DisplayName: "Alice"}
	first, err := s.ApplyClassifiedChatMutationResult(identity, store.ActivitySettings{}, 0, now, true)
	require.NoError(t, err)
	assert.Equal(t, store.GreetingNewViewer, first.GreetingKind)
	assert.Empty(t, first.GreetingSuppressed)
	repeat, err := s.ApplyClassifiedChatMutationResult(identity, store.ActivitySettings{}, 0, now.Add(time.Second), true)
	require.NoError(t, err)
	assert.Empty(t, repeat.GreetingKind)
	require.NoError(t, s.StartSession(now.Add(2*time.Second)))
	returning, err := s.ApplyClassifiedChatMutationResult(identity, store.ActivitySettings{}, 0, now.Add(3*time.Second), true)
	require.NoError(t, err)
	assert.Equal(t, store.GreetingReturningViewer, returning.GreetingKind)
}

func TestGreetings_WhenCommandOrExcluded_ExpectEligibilityHandledCorrectly(t *testing.T) {
	t.Parallel()
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 11, 12, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "youtube", UserID: "24", DisplayName: "Bob"}
	command, err := s.ApplyClassifiedChatMutationResult(identity, store.ActivitySettings{}, 0, now, false)
	require.NoError(t, err)
	assert.Empty(t, command.GreetingKind)
	viewerID, ok := s.ViewerIDForIdentity(identity.Platform, identity.UserID)
	require.True(t, ok)
	require.NoError(t, s.UpdateGreetingsDisabled(viewerID, true))
	excluded, err := s.ApplyClassifiedChatMutationResult(identity, store.ActivitySettings{}, 0, now.Add(time.Second), true)
	require.NoError(t, err)
	assert.Equal(t, store.GreetingNewViewer, excluded.GreetingKind)
	assert.Equal(t, "excluded", excluded.GreetingSuppressed)
	require.NoError(t, s.UpdateGreetingsDisabled(viewerID, false))
	repeat, err := s.ApplyClassifiedChatMutationResult(identity, store.ActivitySettings{}, 0, now.Add(2*time.Second), true)
	require.NoError(t, err)
	assert.Empty(t, repeat.GreetingKind)
}

func TestGreetings_WhenRestartedOrConcurrent_ExpectOnlyOneCommittedQualification(t *testing.T) {
	s, path := openTestStore(t)
	greeting, err := s.GetGreeting(store.GreetingNewViewer)
	require.NoError(t, err)
	greeting.Enabled = true
	_, err = s.UpdateGreeting(*greeting)
	require.NoError(t, err)

	now := time.Date(2026, 9, 11, 12, 0, 0, 0, time.UTC)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "concurrent", DisplayName: "Alice"}
	var wg sync.WaitGroup
	type applyResult struct {
		result store.ChatMutationResult
		err    error
	}
	results := make(chan applyResult, 8)
	for range 8 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			result, applyErr := s.ApplyClassifiedChatMutationResult(identity, store.ActivitySettings{}, 0, now, true)
			results <- applyResult{result: result, err: applyErr}
		}()
	}
	wg.Wait()
	close(results)

	fired := 0
	for applied := range results {
		require.NoError(t, applied.err)
		if applied.result.GreetingKind == store.GreetingNewViewer {
			fired++
		}
	}
	assert.Equal(t, 1, fired)

	require.NoError(t, s.Close())
	reopened, err := store.Open(path, store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, reopened.Close()) })
	repeated, err := reopened.ApplyClassifiedChatMutationResult(identity, store.ActivitySettings{}, 0, now.Add(time.Second), true)
	require.NoError(t, err)
	assert.Empty(t, repeated.GreetingKind)
}

func TestGreetings_WhenCanonicalViewersMerge_ExpectMarkersAndExclusionUnion(t *testing.T) {
	s, _ := openTestStore(t)
	now := time.Date(2026, 9, 11, 12, 0, 0, 0, time.UTC)
	source := store.ChatIdentity{Platform: "twitch", UserID: "source", DisplayName: "Source"}
	target := store.ChatIdentity{Platform: "youtube", UserID: "target", DisplayName: "Target"}

	result, err := s.ApplyClassifiedChatMutationResult(source, store.ActivitySettings{}, 0, now, true)
	require.NoError(t, err)
	assert.Equal(t, store.GreetingNewViewer, result.GreetingKind)
	_, err = s.ApplyClassifiedChatMutationResult(target, store.ActivitySettings{}, 0, now, false)
	require.NoError(t, err)
	sourceID, ok := s.ViewerIDForIdentity(source.Platform, source.UserID)
	require.True(t, ok)
	targetID, ok := s.ViewerIDForIdentity(target.Platform, target.UserID)
	require.True(t, ok)
	require.NoError(t, s.UpdateGreetingsDisabled(sourceID, true))
	require.NoError(t, s.Merge(sourceID, targetID, testDayResetHour, now.Add(time.Second)))

	merged, err := s.Get(targetID, testDayResetHour, now.Add(time.Second))
	require.NoError(t, err)
	assert.True(t, merged.GreetingsDisabled)
	noReplay, err := s.ApplyClassifiedChatMutationResult(target, store.ActivitySettings{}, 0, now.Add(2*time.Second), true)
	require.NoError(t, err)
	assert.Empty(t, noReplay.GreetingKind)
}
