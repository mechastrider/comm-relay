package store_test

import (
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func openSocialTestStore(t *testing.T) *store.Store {
	t.Helper()
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	s, err := store.Open(path, store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })
	return s
}

func seedIdentity(t *testing.T, s *store.Store, platform, userID, username string) {
	t.Helper()
	err := s.ApplyChat(store.ChatIdentity{
		Platform: platform, UserID: userID, Username: username, DisplayName: username,
	}, store.ActivitySettings{}, 0, time.Now())
	require.NoError(t, err)
}

func setRecruitQuotas(t *testing.T, s *store.Store, likeQuota, buffQuota int) {
	t.Helper()
	levels, err := s.ListProgressionLevels()
	require.NoError(t, err)
	var recruit *store.ProgressionLevel
	for i := range levels {
		if levels[i].ID == "recruit" {
			recruit = &levels[i]
			break
		}
	}
	require.NotNil(t, recruit)
	_, err = s.UpdateProgressionLevel(store.UpdateProgressionLevelInput{
		ID: recruit.ID, Title: recruit.Title, MinXP: recruit.MinXP,
		LikeQuota: likeQuota, BuffQuota: buffQuota, Announce: recruit.Announce, Now: time.Now(),
	})
	require.NoError(t, err)
}

func likeInput(giver store.ChatIdentity, like store.Command, remainder string) store.SocialCommandInput {
	return store.SocialCommandInput{
		GiverIdentity: giver, Command: like, Remainder: remainder,
		MessagePlatform: giver.Platform, DayResetHour: 0, Now: time.Now(),
	}
}

func buffInput(giver store.ChatIdentity, buff store.Command, perViewer, maxUnique int) store.SocialCommandInput {
	points := 5
	if buff.Points != nil {
		points = *buff.Points
	} else {
		buff.Points = &points
	}
	return store.SocialCommandInput{
		GiverIdentity: giver, Command: buff,
		BuffsPerAwardPerViewer: perViewer, BuffMaxUniqueViewers: maxUnique,
		DayResetHour: 0, Now: time.Now(),
	}
}

func TestSocialLike_WhenNotFound_ExpectRejected(t *testing.T) {
	s := openSocialTestStore(t)
	seedIdentity(t, s, "twitch", "alice", "alice")
	like, err := s.GetCommand("like")
	require.NoError(t, err)

	result, err := s.ExecuteSocialCommand(store.SocialCommandInput{
		GiverIdentity:   store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"},
		Command:         *like,
		Remainder:       "ghost",
		MessagePlatform: "twitch",
		DayResetHour:    0,
		Now:             time.Now(),
	})
	require.NoError(t, err)
	require.Equal(t, "not_found", result.RejectReason)
}

func TestSocialBuff_WhenAlreadyBuffed_ExpectRejected(t *testing.T) {
	s := openSocialTestStore(t)
	seedIdentity(t, s, "twitch", "alice", "alice")
	seedIdentity(t, s, "twitch", "bob", "bob")
	_, err := s.GrantAward(store.GrantAwardInput{
		Identity: store.ChatIdentity{Platform: "twitch", UserID: "bob", Username: "bob"},
		AwardID:  "spotter", AwardName: "Spotter", Points: 5, DayResetHour: 0, Now: time.Now(),
	})
	require.NoError(t, err)

	buff, err := s.GetCommand("buff")
	require.NoError(t, err)
	points := 5
	buff.Points = &points
	input := store.SocialCommandInput{
		GiverIdentity:          store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"},
		Command:                *buff,
		BuffsPerAwardPerViewer: 1,
		BuffMaxUniqueViewers:   5,
		DayResetHour:           0,
		Now:                    time.Now(),
	}
	first, err := s.ExecuteSocialCommand(input)
	require.NoError(t, err)
	require.Equal(t, "fired", first.Status)

	second, err := s.ExecuteSocialCommand(input)
	require.NoError(t, err)
	require.Equal(t, "already_buffed", second.RejectReason)
}

func TestSocialLike_WhenMissingArg_ExpectRejected(t *testing.T) {
	s := openSocialTestStore(t)
	seedIdentity(t, s, "twitch", "alice", "alice")

	like, err := s.GetCommand("like")
	require.NoError(t, err)

	result, err := s.ExecuteSocialCommand(store.SocialCommandInput{
		GiverIdentity:   store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"},
		Command:         *like,
		Remainder:       "",
		MessagePlatform: "twitch",
		DayResetHour:    0,
		Now:             time.Now(),
	})
	require.NoError(t, err)
	require.Equal(t, "rejected", result.Status)
	require.Equal(t, "missing_arg", result.RejectReason)
}

func TestSocialLike_WhenSelf_ExpectRejectedWithoutQuotaUse(t *testing.T) {
	s := openSocialTestStore(t)
	seedIdentity(t, s, "twitch", "alice", "alice")

	like, err := s.GetCommand("like")
	require.NoError(t, err)

	result, err := s.ExecuteSocialCommand(store.SocialCommandInput{
		GiverIdentity:   store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"},
		Command:         *like,
		Remainder:       "alice",
		MessagePlatform: "twitch",
		DayResetHour:    0,
		Now:             time.Now(),
	})
	require.NoError(t, err)
	require.Equal(t, "self", result.RejectReason)

	result2, err := s.ExecuteSocialCommand(store.SocialCommandInput{
		GiverIdentity:   store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"},
		Command:         *like,
		Remainder:       "alice",
		MessagePlatform: "twitch",
		DayResetHour:    0,
		Now:             time.Now(),
	})
	require.NoError(t, err)
	require.Equal(t, "self", result2.RejectReason)
}

func TestSocialLike_WhenSuccess_ExpectRecipientAwardAndGiverCommandEvent(t *testing.T) {
	s := openSocialTestStore(t)
	seedIdentity(t, s, "twitch", "alice", "alice")
	seedIdentity(t, s, "twitch", "bob", "bob")

	like, err := s.GetCommand("like")
	require.NoError(t, err)

	result, err := s.ExecuteSocialCommand(store.SocialCommandInput{
		GiverIdentity:   store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"},
		Command:         *like,
		Remainder:       "bob",
		MessagePlatform: "twitch",
		DayResetHour:    0,
		Now:             time.Now(),
	})
	require.NoError(t, err)
	require.Equal(t, "fired", result.Status)

	aliceID, _ := s.ViewerIDForIdentity("twitch", "alice")
	bobID, _ := s.ViewerIDForIdentity("twitch", "bob")

	aliceEvents, err := s.ListInteractionEventsByViewer(aliceID)
	require.NoError(t, err)
	require.Len(t, aliceEvents, 1)
	require.Equal(t, store.InteractionEventCommand, aliceEvents[0].Kind)

	bobEvents, err := s.ListInteractionEventsByViewer(bobID)
	require.NoError(t, err)
	require.Len(t, bobEvents, 1)
	require.Equal(t, store.InteractionEventAward, bobEvents[0].Kind)
	require.Equal(t, "viewer_like", bobEvents[0].AwardID)
}

func TestSocialBuff_WhenNoOperatorAward_ExpectNoAward(t *testing.T) {
	s := openSocialTestStore(t)
	seedIdentity(t, s, "twitch", "alice", "alice")

	buff, err := s.GetCommand("buff")
	require.NoError(t, err)

	result, err := s.ExecuteSocialCommand(store.SocialCommandInput{
		GiverIdentity:          store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"},
		Command:                *buff,
		BuffsPerAwardPerViewer: 1,
		BuffMaxUniqueViewers:   5,
		DayResetHour:           0,
		Now:                    time.Now(),
	})
	require.NoError(t, err)
	require.Equal(t, "no_award", result.RejectReason)
}

func TestSocialBuff_WhenSuccess_ExpectNoAwardCountInflation(t *testing.T) {
	s := openSocialTestStore(t)
	seedIdentity(t, s, "twitch", "alice", "alice")
	seedIdentity(t, s, "twitch", "bob", "bob")

	bobID, _ := s.ViewerIDForIdentity("twitch", "bob")
	_, err := s.GrantAward(store.GrantAwardInput{
		Identity:     store.ChatIdentity{Platform: "twitch", UserID: "bob", Username: "bob"},
		AwardID:      "spotter",
		AwardName:    "Spotter",
		Points:       5,
		DayResetHour: 0,
		Now:          time.Now(),
	})
	require.NoError(t, err)

	before, err := s.ProgressionMetricValue(bobID, store.ProgressionMetricAwardCount, "spotter")
	require.NoError(t, err)
	require.Equal(t, 1, before)

	buff, err := s.GetCommand("buff")
	require.NoError(t, err)
	points := 5
	buff.Points = &points

	result, err := s.ExecuteSocialCommand(store.SocialCommandInput{
		GiverIdentity:          store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"},
		Command:                *buff,
		BuffsPerAwardPerViewer: 1,
		BuffMaxUniqueViewers:   5,
		DayResetHour:           0,
		Now:                    time.Now(),
	})
	require.NoError(t, err)
	require.Equal(t, "fired", result.Status)

	after, err := s.ProgressionMetricValue(bobID, store.ProgressionMetricAwardCount, "spotter")
	require.NoError(t, err)
	require.Equal(t, 1, after)
}

func TestSocialBuff_WhenConcurrentUniqueCap_ExpectAtMostCap(t *testing.T) {
	s := openSocialTestStore(t)
	seedIdentity(t, s, "twitch", "bob", "bob")
	bobID, _ := s.ViewerIDForIdentity("twitch", "bob")
	_, err := s.GrantAward(store.GrantAwardInput{
		Identity: store.ChatIdentity{Platform: "twitch", UserID: "bob", Username: "bob"},
		AwardID:  "spotter", AwardName: "Spotter", Points: 5, DayResetHour: 0, Now: time.Now(),
	})
	require.NoError(t, err)

	buff, err := s.GetCommand("buff")
	require.NoError(t, err)
	points := 5
	buff.Points = &points

	for i := 0; i < 6; i++ {
		userID := string(rune('a' + i))
		seedIdentity(t, s, "twitch", userID, userID)
	}
	var wg sync.WaitGroup
	results := make(chan store.SocialCommandResult, 6)
	for i := 0; i < 6; i++ {
		userID := string(rune('a' + i))
		wg.Add(1)
		go func(uid string) {
			defer wg.Done()
			result, execErr := s.ExecuteSocialCommand(store.SocialCommandInput{
				GiverIdentity:          store.ChatIdentity{Platform: "twitch", UserID: uid, Username: uid},
				Command:                *buff,
				BuffsPerAwardPerViewer: 1,
				BuffMaxUniqueViewers:   5,
				DayResetHour:           0,
				Now:                    time.Now(),
			})
			require.NoError(t, execErr)
			results <- result
		}(userID)
	}
	wg.Wait()
	close(results)

	fired := 0
	full := 0
	for result := range results {
		switch result.Status {
		case "fired":
			fired++
		case "rejected":
			if result.RejectReason == "award_full" {
				full++
			}
		}
	}
	require.Equal(t, 5, fired)
	require.Equal(t, 1, full)

	afterXP, err := s.ProgressionMetricValue(bobID, store.ProgressionMetricXP, "")
	require.NoError(t, err)
	require.Equal(t, 5+5*fired, afterXP)
}

func TestSocialLike_WhenQuotaExhausted_ExpectRejectedWithoutRecipientXPChange(t *testing.T) {
	s := openSocialTestStore(t)
	setRecruitQuotas(t, s, 1, 5)
	seedIdentity(t, s, "twitch", "alice", "alice")
	seedIdentity(t, s, "twitch", "bob", "bob")
	bobID, _ := s.ViewerIDForIdentity("twitch", "bob")

	like, err := s.GetCommand("like")
	require.NoError(t, err)
	giver := store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"}

	first, err := s.ExecuteSocialCommand(likeInput(giver, *like, "bob"))
	require.NoError(t, err)
	require.Equal(t, "fired", first.Status)

	xpAfterFirst, err := s.ProgressionMetricValue(bobID, store.ProgressionMetricXP, "")
	require.NoError(t, err)

	second, err := s.ExecuteSocialCommand(likeInput(giver, *like, "bob"))
	require.NoError(t, err)
	require.Equal(t, "rejected", second.Status)
	require.Equal(t, "quota", second.RejectReason)

	xpAfterSecond, err := s.ProgressionMetricValue(bobID, store.ProgressionMetricXP, "")
	require.NoError(t, err)
	require.Equal(t, xpAfterFirst, xpAfterSecond)
}

func TestSocialLike_WhenLevelLikeQuotaZero_ExpectRejectedQuota(t *testing.T) {
	s := openSocialTestStore(t)
	setRecruitQuotas(t, s, 0, 5)
	seedIdentity(t, s, "twitch", "alice", "alice")
	seedIdentity(t, s, "twitch", "bob", "bob")

	like, err := s.GetCommand("like")
	require.NoError(t, err)
	giver := store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"}

	result, err := s.ExecuteSocialCommand(likeInput(giver, *like, "bob"))
	require.NoError(t, err)
	require.Equal(t, "rejected", result.Status)
	require.Equal(t, "quota", result.RejectReason)
}

func TestSocialBuff_WhenLikeQuotaSpent_ExpectBuffStillFires(t *testing.T) {
	s := openSocialTestStore(t)
	setRecruitQuotas(t, s, 1, 1)
	seedIdentity(t, s, "twitch", "alice", "alice")
	seedIdentity(t, s, "twitch", "bob", "bob")

	like, err := s.GetCommand("like")
	require.NoError(t, err)
	giver := store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"}

	likeResult, err := s.ExecuteSocialCommand(likeInput(giver, *like, "bob"))
	require.NoError(t, err)
	require.Equal(t, "fired", likeResult.Status)

	quotaLike, err := s.ExecuteSocialCommand(likeInput(giver, *like, "bob"))
	require.NoError(t, err)
	require.Equal(t, "quota", quotaLike.RejectReason)

	_, err = s.GrantAward(store.GrantAwardInput{
		Identity: store.ChatIdentity{Platform: "twitch", UserID: "bob", Username: "bob"},
		AwardID:  "spotter", AwardName: "Spotter", Points: 5, DayResetHour: 0, Now: time.Now(),
	})
	require.NoError(t, err)

	buff, err := s.GetCommand("buff")
	require.NoError(t, err)
	buffResult, err := s.ExecuteSocialCommand(buffInput(giver, *buff, 1, 5))
	require.NoError(t, err)
	require.Equal(t, "fired", buffResult.Status)
}

func TestSocialLike_WhenNewStreamStarted_ExpectQuotaRefilled(t *testing.T) {
	s := openSocialTestStore(t)
	setRecruitQuotas(t, s, 1, 1)
	seedIdentity(t, s, "twitch", "alice", "alice")
	seedIdentity(t, s, "twitch", "bob", "bob")

	like, err := s.GetCommand("like")
	require.NoError(t, err)
	giver := store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"}

	first, err := s.ExecuteSocialCommand(likeInput(giver, *like, "bob"))
	require.NoError(t, err)
	require.Equal(t, "fired", first.Status)

	exhausted, err := s.ExecuteSocialCommand(likeInput(giver, *like, "bob"))
	require.NoError(t, err)
	require.Equal(t, "quota", exhausted.RejectReason)

	require.NoError(t, s.StartSession(time.Now().Add(time.Minute)))
	seedIdentity(t, s, "twitch", "bob", "bob")

	afterReset, err := s.ExecuteSocialCommand(likeInput(giver, *like, "bob"))
	require.NoError(t, err)
	require.Equal(t, "fired", afterReset.Status)
}

func TestSocialLike_WhenStoreReopened_ExpectQuotaStillConsumed(t *testing.T) {
	path := filepath.Join(t.TempDir(), "comm-relay.db")
	s1, err := store.Open(path, store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)

	setRecruitQuotas(t, s1, 1, 5)
	seedIdentity(t, s1, "twitch", "alice", "alice")
	seedIdentity(t, s1, "twitch", "bob", "bob")

	like, err := s1.GetCommand("like")
	require.NoError(t, err)
	giver := store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"}

	first, err := s1.ExecuteSocialCommand(likeInput(giver, *like, "bob"))
	require.NoError(t, err)
	require.Equal(t, "fired", first.Status)
	require.NoError(t, s1.Close())

	s2, err := store.Open(path, store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s2.Close()) })

	second, err := s2.ExecuteSocialCommand(likeInput(giver, *like, "bob"))
	require.NoError(t, err)
	require.Equal(t, "rejected", second.Status)
	require.Equal(t, "quota", second.RejectReason)
}

func TestSocialBuff_WhenUniqueCapZero_ExpectAwardFullWithoutQuotaUse(t *testing.T) {
	s := openSocialTestStore(t)
	setRecruitQuotas(t, s, 5, 1)
	seedIdentity(t, s, "twitch", "alice", "alice")
	seedIdentity(t, s, "twitch", "bob", "bob")
	_, err := s.GrantAward(store.GrantAwardInput{
		Identity: store.ChatIdentity{Platform: "twitch", UserID: "bob", Username: "bob"},
		AwardID:  "spotter", AwardName: "Spotter", Points: 5, DayResetHour: 0, Now: time.Now(),
	})
	require.NoError(t, err)

	buff, err := s.GetCommand("buff")
	require.NoError(t, err)
	giver := store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"}

	blocked, err := s.ExecuteSocialCommand(buffInput(giver, *buff, 1, 0))
	require.NoError(t, err)
	require.Equal(t, "rejected", blocked.Status)
	require.Equal(t, "award_full", blocked.RejectReason)

	fired, err := s.ExecuteSocialCommand(buffInput(giver, *buff, 1, 5))
	require.NoError(t, err)
	require.Equal(t, "fired", fired.Status)
}

func TestSocialBuff_WhenPerViewerCapZero_ExpectAlreadyBuffedWithoutQuotaUse(t *testing.T) {
	s := openSocialTestStore(t)
	setRecruitQuotas(t, s, 5, 1)
	seedIdentity(t, s, "twitch", "alice", "alice")
	seedIdentity(t, s, "twitch", "bob", "bob")
	_, err := s.GrantAward(store.GrantAwardInput{
		Identity: store.ChatIdentity{Platform: "twitch", UserID: "bob", Username: "bob"},
		AwardID:  "spotter", AwardName: "Spotter", Points: 5, DayResetHour: 0, Now: time.Now(),
	})
	require.NoError(t, err)

	buff, err := s.GetCommand("buff")
	require.NoError(t, err)
	giver := store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"}

	blocked, err := s.ExecuteSocialCommand(buffInput(giver, *buff, 0, 5))
	require.NoError(t, err)
	require.Equal(t, "rejected", blocked.Status)
	require.Equal(t, "already_buffed", blocked.RejectReason)

	fired, err := s.ExecuteSocialCommand(buffInput(giver, *buff, 1, 5))
	require.NoError(t, err)
	require.Equal(t, "fired", fired.Status)
}

func TestSocialLike_WhenAmbiguousSamePlatform_ExpectRejected(t *testing.T) {
	s := openSocialTestStore(t)
	seedIdentity(t, s, "twitch", "bob-one", "bob")
	seedIdentity(t, s, "twitch", "bob-two", "bob")
	seedIdentity(t, s, "twitch", "alice", "alice")

	like, err := s.GetCommand("like")
	require.NoError(t, err)
	giver := store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"}

	result, err := s.ExecuteSocialCommand(likeInput(giver, *like, "bob"))
	require.NoError(t, err)
	require.Equal(t, "ambiguous", result.RejectReason)
}

func TestSocialBuff_WhenLatestOperatorAwardIsGiver_ExpectSelfWithoutOlderTarget(t *testing.T) {
	s := openSocialTestStore(t)
	seedIdentity(t, s, "twitch", "alice", "alice")
	seedIdentity(t, s, "twitch", "bob", "bob")
	aliceID, _ := s.ViewerIDForIdentity("twitch", "alice")
	bobID, _ := s.ViewerIDForIdentity("twitch", "bob")

	_, err := s.GrantAward(store.GrantAwardInput{
		Identity: store.ChatIdentity{Platform: "twitch", UserID: "bob", Username: "bob"},
		AwardID:  "spotter", AwardName: "Spotter", Points: 5, DayResetHour: 0, Now: time.Now(),
	})
	require.NoError(t, err)
	bobXPBefore, err := s.ProgressionMetricValue(bobID, store.ProgressionMetricXP, "")
	require.NoError(t, err)

	_, err = s.GrantAward(store.GrantAwardInput{
		Identity: store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"},
		AwardID:  "spotter", AwardName: "Spotter", Points: 5, DayResetHour: 0, Now: time.Now(),
	})
	require.NoError(t, err)

	buff, err := s.GetCommand("buff")
	require.NoError(t, err)
	giver := store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"}

	result, err := s.ExecuteSocialCommand(buffInput(giver, *buff, 1, 5))
	require.NoError(t, err)
	require.Equal(t, "self", result.RejectReason)

	bobXPAfter, err := s.ProgressionMetricValue(bobID, store.ProgressionMetricXP, "")
	require.NoError(t, err)
	require.Equal(t, bobXPBefore, bobXPAfter)

	aliceXP, err := s.ProgressionMetricValue(aliceID, store.ProgressionMetricXP, "")
	require.NoError(t, err)
	require.Equal(t, 5, aliceXP)
}

func TestSocialLike_WhenBoundAwardMissing_ExpectNoAward(t *testing.T) {
	s := openSocialTestStore(t)
	seedIdentity(t, s, "twitch", "alice", "alice")
	seedIdentity(t, s, "twitch", "bob", "bob")

	_, err := s.CreateAward(store.CreateAwardInput{
		ID: "temp_peer", Name: "Temp", Points: 1, SplashTemplate: "{viewer}", DurationMs: 3000,
	})
	require.NoError(t, err)
	cmd, err := s.CreateCommand(store.CreateCommandInput{
		ID: "peer_like", Trigger: "peerlike", Enabled: true, Action: store.CommandActionLike, AwardID: "temp_peer",
	})
	require.NoError(t, err)
	require.NoError(t, s.DeleteAward("temp_peer"))

	giver := store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"}
	result, err := s.ExecuteSocialCommand(likeInput(giver, *cmd, "bob"))
	require.NoError(t, err)
	require.Equal(t, "no_award", result.RejectReason)
}

func TestSocialBuff_WhenNamedViewerWithoutOperatorAward_ExpectNoAward(t *testing.T) {
	s := openSocialTestStore(t)
	seedIdentity(t, s, "twitch", "alice", "alice")
	seedIdentity(t, s, "twitch", "bob", "bob")

	buff, err := s.GetCommand("buff")
	require.NoError(t, err)
	giver := store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"}

	result, err := s.ExecuteSocialCommand(store.SocialCommandInput{
		GiverIdentity: giver, Command: *buff, Remainder: "bob",
		MessagePlatform: "twitch", BuffsPerAwardPerViewer: 1, BuffMaxUniqueViewers: 5,
		DayResetHour: 0, Now: time.Now(),
	})
	require.NoError(t, err)
	require.Equal(t, "no_award", result.RejectReason)
}

func TestSocialLikeAndBuff_WhenSuccess_ExpectGiverXPUnchanged(t *testing.T) {
	s := openSocialTestStore(t)
	setRecruitQuotas(t, s, 5, 5)
	seedIdentity(t, s, "twitch", "alice", "alice")
	seedIdentity(t, s, "twitch", "bob", "bob")
	aliceID, _ := s.ViewerIDForIdentity("twitch", "alice")

	like, err := s.GetCommand("like")
	require.NoError(t, err)
	giver := store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"}

	xpBefore, err := s.ProgressionMetricValue(aliceID, store.ProgressionMetricXP, "")
	require.NoError(t, err)

	likeResult, err := s.ExecuteSocialCommand(likeInput(giver, *like, "bob"))
	require.NoError(t, err)
	require.Equal(t, "fired", likeResult.Status)

	_, err = s.GrantAward(store.GrantAwardInput{
		Identity: store.ChatIdentity{Platform: "twitch", UserID: "bob", Username: "bob"},
		AwardID:  "spotter", AwardName: "Spotter", Points: 5, DayResetHour: 0, Now: time.Now(),
	})
	require.NoError(t, err)

	buff, err := s.GetCommand("buff")
	require.NoError(t, err)
	buffResult, err := s.ExecuteSocialCommand(buffInput(giver, *buff, 1, 5))
	require.NoError(t, err)
	require.Equal(t, "fired", buffResult.Status)

	xpAfter, err := s.ProgressionMetricValue(aliceID, store.ProgressionMetricXP, "")
	require.NoError(t, err)
	require.Equal(t, xpBefore, xpAfter)
}

func TestSocialLike_WhenTwoLikeCommands_ExpectSharedQuota(t *testing.T) {
	s := openSocialTestStore(t)
	setRecruitQuotas(t, s, 1, 5)
	seedIdentity(t, s, "twitch", "alice", "alice")
	seedIdentity(t, s, "twitch", "bob", "bob")

	like, err := s.GetCommand("like")
	require.NoError(t, err)
	alt, err := s.CreateCommand(store.CreateCommandInput{
		ID: "heart", Trigger: "heart", Enabled: true, Action: store.CommandActionLike, AwardID: "viewer_like",
	})
	require.NoError(t, err)
	giver := store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"}

	first, err := s.ExecuteSocialCommand(likeInput(giver, *like, "bob"))
	require.NoError(t, err)
	require.Equal(t, "fired", first.Status)

	second, err := s.ExecuteSocialCommand(likeInput(giver, *alt, "bob"))
	require.NoError(t, err)
	require.Equal(t, "quota", second.RejectReason)
}

func TestSocialBuff_WhenPerViewerCapTwo_ExpectThirdRejected(t *testing.T) {
	s := openSocialTestStore(t)
	setRecruitQuotas(t, s, 5, 5)
	seedIdentity(t, s, "twitch", "alice", "alice")
	seedIdentity(t, s, "twitch", "bob", "bob")
	_, err := s.GrantAward(store.GrantAwardInput{
		Identity: store.ChatIdentity{Platform: "twitch", UserID: "bob", Username: "bob"},
		AwardID:  "spotter", AwardName: "Spotter", Points: 5, DayResetHour: 0, Now: time.Now(),
	})
	require.NoError(t, err)

	buff, err := s.GetCommand("buff")
	require.NoError(t, err)
	giver := store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"}
	input := buffInput(giver, *buff, 2, 5)

	first, err := s.ExecuteSocialCommand(input)
	require.NoError(t, err)
	require.Equal(t, "fired", first.Status)

	second, err := s.ExecuteSocialCommand(input)
	require.NoError(t, err)
	require.Equal(t, "fired", second.Status)

	third, err := s.ExecuteSocialCommand(input)
	require.NoError(t, err)
	require.Equal(t, "already_buffed", third.RejectReason)
}

func TestSocialBuff_WhenPeerLikeIsLatest_ExpectOperatorGrantStillBuffed(t *testing.T) {
	s := openSocialTestStore(t)
	seedIdentity(t, s, "twitch", "alice", "alice")
	seedIdentity(t, s, "twitch", "bob", "bob")
	bobID, _ := s.ViewerIDForIdentity("twitch", "bob")

	_, err := s.GrantAward(store.GrantAwardInput{
		Identity: store.ChatIdentity{Platform: "twitch", UserID: "bob", Username: "bob"},
		AwardID:  "spotter", AwardName: "Spotter", Points: 5, DayResetHour: 0, Now: time.Now(),
	})
	require.NoError(t, err)

	like, err := s.GetCommand("like")
	require.NoError(t, err)
	giver := store.ChatIdentity{Platform: "twitch", UserID: "alice", Username: "alice"}
	likeResult, err := s.ExecuteSocialCommand(likeInput(giver, *like, "bob"))
	require.NoError(t, err)
	require.Equal(t, "fired", likeResult.Status)

	buff, err := s.GetCommand("buff")
	require.NoError(t, err)
	buffResult, err := s.ExecuteSocialCommand(buffInput(giver, *buff, 1, 5))
	require.NoError(t, err)
	require.Equal(t, "fired", buffResult.Status)

	xp, err := s.ProgressionMetricValue(bobID, store.ProgressionMetricXP, "")
	require.NoError(t, err)
	require.Equal(t, 5+5+5, xp)
}
