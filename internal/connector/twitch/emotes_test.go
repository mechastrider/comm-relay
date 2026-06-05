package twitch

import (
	"testing"

	"github.com/gempir/go-twitch-irc/v4"
	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/stretchr/testify/require"
)

func TestMapEmoteFragments_WhenNoEmotes_ExpectNil(t *testing.T) {
	t.Parallel()

	require.Nil(t, mapEmoteFragments("Hello chat", nil))
}

func TestMapEmoteFragments_WhenMixedTextAndEmote_ExpectOrderedFragments(t *testing.T) {
	t.Parallel()

	message := "Hello Kappa world"
	emotes := []*twitch.Emote{
		{
			Name: "Kappa",
			ID:   "25",
			Positions: []twitch.EmotePosition{
				{Start: 6, End: 10},
			},
		},
	}

	got := mapEmoteFragments(message, emotes)

	require.Len(t, got, 3)
	require.Equal(t, bus.FragmentTypeText, got[0].Type)
	require.Equal(t, "Hello ", got[0].Text)
	require.Equal(t, bus.FragmentTypeEmote, got[1].Type)
	require.Equal(t, "Kappa", got[1].Text)
	require.Equal(t, "twitch", got[1].Provider)
	require.Equal(t, "25", got[1].ID)
	require.Equal(t, "https://static-cdn.jtvnw.net/emoticons/v2/25/static/dark/2.0", got[1].URL)
	require.Equal(t, 28, got[1].Width)
	require.Equal(t, 28, got[1].Height)
	require.False(t, got[1].Animated)
	require.Equal(t, bus.FragmentTypeText, got[2].Type)
	require.Equal(t, " world", got[2].Text)
}

func TestMapEmoteFragments_WhenRepeatedEmote_ExpectMultipleEmoteFragments(t *testing.T) {
	t.Parallel()

	message := "Kappa Kappa"
	emotes := []*twitch.Emote{
		{
			Name:  "Kappa",
			ID:    "25",
			Count: 2,
			Positions: []twitch.EmotePosition{
				{Start: 0, End: 4},
				{Start: 6, End: 10},
			},
		},
	}

	got := mapEmoteFragments(message, emotes)

	require.Len(t, got, 3)
	require.Equal(t, bus.FragmentTypeEmote, got[0].Type)
	require.Equal(t, "Kappa", got[0].Text)
	require.Equal(t, "25", got[0].ID)
	require.Equal(t, bus.FragmentTypeText, got[1].Type)
	require.Equal(t, " ", got[1].Text)
	require.Equal(t, bus.FragmentTypeEmote, got[2].Type)
	require.Equal(t, "Kappa", got[2].Text)
	require.Equal(t, "25", got[2].ID)
}

func TestMapEmoteFragments_WhenOverlappingPositions_ExpectNil(t *testing.T) {
	t.Parallel()

	message := "KappaKeepo"
	emotes := []*twitch.Emote{
		{
			Name: "Kappa",
			ID:   "25",
			Positions: []twitch.EmotePosition{
				{Start: 0, End: 4},
			},
		},
		{
			Name: "Keepo",
			ID:   "1902",
			Positions: []twitch.EmotePosition{
				{Start: 3, End: 7},
			},
		},
	}

	require.Nil(t, mapEmoteFragments(message, emotes))
}

func TestMapEmoteFragments_WhenOutOfBoundsPosition_ExpectNil(t *testing.T) {
	t.Parallel()

	message := "Kappa"
	emotes := []*twitch.Emote{
		{
			Name: "Kappa",
			ID:   "25",
			Positions: []twitch.EmotePosition{
				{Start: 0, End: 99},
			},
		},
	}

	require.Nil(t, mapEmoteFragments(message, emotes))
}

func TestMapPrivateMessage_WhenIRCEmotesParsed_ExpectFragments(t *testing.T) {
	t.Parallel()

	raw := "@emotes=25:6-10/1902:16-20;id=abc :user!user@user.tmi.twitch.tv PRIVMSG #channel :-tags Kappa 123 Keepo"
	msg := twitch.ParseMessage(raw).(*twitch.PrivateMessage)

	got := MapPrivateMessage(*msg, true)

	require.Equal(t, "-tags Kappa 123 Keepo", got.Message)
	require.Len(t, got.Fragments, 4)
	require.Equal(t, bus.FragmentTypeText, got.Fragments[0].Type)
	require.Equal(t, "-tags ", got.Fragments[0].Text)
	require.Equal(t, bus.FragmentTypeEmote, got.Fragments[1].Type)
	require.Equal(t, "Kappa", got.Fragments[1].Text)
	require.Equal(t, "25", got.Fragments[1].ID)
	require.Equal(t, bus.FragmentTypeText, got.Fragments[2].Type)
	require.Equal(t, " 123 ", got.Fragments[2].Text)
	require.Equal(t, bus.FragmentTypeEmote, got.Fragments[3].Type)
	require.Equal(t, "Keepo", got.Fragments[3].Text)
	require.Equal(t, "1902", got.Fragments[3].ID)
}

func TestMapPrivateMessage_WhenTwitchEmotesDisabled_ExpectNoFragments(t *testing.T) {
	t.Parallel()

	msg := twitch.PrivateMessage{
		Message: "Kappa",
		Emotes: []*twitch.Emote{
			{ID: "25", Positions: []twitch.EmotePosition{{Start: 0, End: 4}}},
		},
	}

	got := MapPrivateMessage(msg, false)

	require.Empty(t, got.Fragments)
}

func TestMapPrivateMessage_WhenNoEmotes_ExpectNoFragments(t *testing.T) {
	t.Parallel()

	msg := twitch.PrivateMessage{
		Message: "plain text",
		User: twitch.User{
			ID:   "1",
			Name: "viewer",
		},
	}

	got := MapPrivateMessage(msg, true)

	require.Equal(t, "plain text", got.Message)
	require.Nil(t, got.Fragments)
}
