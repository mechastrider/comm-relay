package twitch

import (
	"testing"
	"time"

	"github.com/gempir/go-twitch-irc/v4"
	"github.com/stretchr/testify/require"
)

func TestMapPrivateMessage_WhenFullTags_ExpectUnifiedFields(t *testing.T) {
	t.Parallel()

	ts := time.Date(2026, 6, 3, 12, 0, 0, 0, time.UTC)
	msg := twitch.PrivateMessage{
		ID:      "abc-123",
		Message: "Hello chat",
		Time:    ts,
		User: twitch.User{
			ID:          "42",
			Name:        "viewer",
			DisplayName: "Viewer",
			Badges: map[string]int{
				"subscriber": 12,
				"moderator":  1,
			},
		},
	}

	got := MapPrivateMessage(msg)

	require.Equal(t, "abc-123", got.ID)
	require.Equal(t, "twitch", got.Platform)
	require.Equal(t, "42", got.UserID)
	require.Equal(t, "viewer", got.Username)
	require.Equal(t, "Viewer", got.DisplayName)
	require.Equal(t, "Hello chat", got.Message)
	require.Equal(t, ts, got.Timestamp)
	require.Equal(t, []string{"moderator", "subscriber"}, got.Badges)
}

func TestMapPrivateMessage_WhenMissingID_ExpectSyntheticID(t *testing.T) {
	t.Parallel()

	msg := twitch.PrivateMessage{
		Message: "hi",
		User: twitch.User{
			ID:   "99",
			Name: "anon",
		},
	}

	got := MapPrivateMessage(msg)

	require.Contains(t, got.ID, "99-")
	require.Equal(t, "anon", got.DisplayName)
}

func TestNormalizeChannel_WhenHashPrefix_ExpectLowercaseName(t *testing.T) {
	t.Parallel()

	require.Equal(t, "streamer", normalizeChannel("#Streamer"))
}
