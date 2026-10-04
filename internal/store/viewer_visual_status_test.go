package store_test

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestViewerVisualStatus_WhenActionsAndSessionChange_ExpectAuthoritativeIndependentUses(t *testing.T) {
	// Arrange.
	s := openSocialTestStore(t)
	seedIdentity(t, s, "twitch", "alice", "alice")
	seedIdentity(t, s, "twitch", "bob", "bob")
	setRecruitQuotas(t, s, 3, 2)
	like, err := s.GetCommand("like")
	require.NoError(t, err)
	identity := store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"}
	lookup := []store.ViewerStatusIdentity{{Platform: "twitch", UserID: "alice"}}
	before, err := s.ViewerVisualStatuses(lookup)
	require.NoError(t, err)
	require.Len(t, before, 1)

	// Act: a successful action and then a rejected self-like.
	result, err := s.ExecuteSocialCommand(likeInput(identity, *like, "bob"))
	require.NoError(t, err)
	require.Equal(t, "fired", result.Status)
	result, err = s.ExecuteSocialCommand(likeInput(identity, *like, "alice"))
	require.NoError(t, err)
	require.Equal(t, "rejected", result.Status)
	after, err := s.ViewerVisualStatuses(lookup)
	require.NoError(t, err)

	// Assert: one committed like consumed, buff unchanged, rename keeps emblem.
	require.Equal(t, 2, after[0].LikeRemaining)
	require.Equal(t, 2, after[0].BuffRemaining)
	require.Equal(t, "chevron_1", after[0].Level.Emblem)
	setRecruitQuotas(t, s, 0, 100)
	after, err = s.ViewerVisualStatuses(lookup)
	require.NoError(t, err)
	require.Zero(t, after[0].LikeRemaining)
	require.Equal(t, 100, after[0].BuffRemaining)
	setRecruitQuotas(t, s, 3, 2)
	require.NoError(t, s.StartSession(time.Now().Add(time.Minute)))
	after, err = s.ViewerVisualStatuses(lookup)
	require.NoError(t, err)
	require.Equal(t, 3, after[0].LikeRemaining)
	require.NotEqual(t, before[0].SessionID, after[0].SessionID)
}

func TestViewerVisualStatus_WhenIdentitiesMerged_ExpectSameCanonicalState(t *testing.T) {
	// Arrange.
	s := openSocialTestStore(t)
	seedIdentity(t, s, "twitch", "alice", "alice")
	seedIdentity(t, s, "youtube", "alice-yt", "aliceyt")
	a, ok := s.ViewerIDForIdentity("twitch", "alice")
	require.True(t, ok)
	b, ok := s.ViewerIDForIdentity("youtube", "alice-yt")
	require.True(t, ok)
	require.NoError(t, s.Merge(b, a, 0, time.Now()))

	// Act.
	statuses, err := s.ViewerVisualStatuses([]store.ViewerStatusIdentity{
		{Platform: "twitch", UserID: "alice"}, {Platform: "youtube", UserID: "alice-yt"},
		{Platform: "twitch", UserID: "unknown"},
	})

	// Assert.
	require.NoError(t, err)
	require.Len(t, statuses, 2)
	require.Equal(t, a, statuses[0].ViewerID)
	require.Equal(t, a, statuses[1].ViewerID)
	require.Equal(t, statuses[0].LikeRemaining, statuses[1].LikeRemaining)
	_, exists := s.ViewerIDForIdentity("twitch", "unknown")
	require.False(t, exists)
	_, err = s.ViewerVisualStatuses(make([]store.ViewerStatusIdentity, 101))
	require.ErrorIs(t, err, store.ErrProgressionValidation)
}

func TestLevelEmblem_WhenEditedAndOmitted_ExpectPreservedAllowlistedSelection(t *testing.T) {
	// Arrange.
	s := openSocialTestStore(t)
	created, err := s.CreateProgressionLevel(store.CreateProgressionLevelInput{ID: "pilot", Title: "Pilot", MinXP: 77, Emblem: "star"})
	require.NoError(t, err)
	require.Equal(t, "star", created.Emblem)

	// Act.
	updated, err := s.UpdateProgressionLevel(store.UpdateProgressionLevelInput{ID: "pilot", Title: "Captain", MinXP: 77})

	// Assert.
	require.NoError(t, err)
	require.Equal(t, "star", updated.Emblem)
	_, err = s.UpdateProgressionLevel(store.UpdateProgressionLevelInput{ID: "pilot", Title: "Captain", MinXP: 77, Emblem: "https://example.test/icon.svg"})
	require.ErrorIs(t, err, store.ErrProgressionValidation)
}
