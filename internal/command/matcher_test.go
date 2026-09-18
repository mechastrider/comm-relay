package command_test

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/command"
	"github.com/mechastrider/comm-relay/internal/store"
)

func openTestStore(t *testing.T) *store.Store {
	t.Helper()

	path := filepath.Join(t.TempDir(), "comm-relay.db")
	s, err := store.Open(path, store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })

	return s
}

func TestParseLine_WhenBangGG_ExpectTrigger(t *testing.T) {
	t.Parallel()

	token, remainder, ok := command.ParseLine("  !GG  ")
	require.True(t, ok)
	require.Equal(t, "gg", token)
	require.Empty(t, remainder)
}

func TestParseLine_WhenNoBang_ExpectNoMatch(t *testing.T) {
	t.Parallel()

	_, _, ok := command.ParseLine("gg")
	require.False(t, ok)
}

func TestParseLine_WhenExtraWords_ExpectTokenAndRemainder(t *testing.T) {
	t.Parallel()

	token, remainder, ok := command.ParseLine("!gg please")
	require.True(t, ok)
	require.Equal(t, "gg", token)
	require.Equal(t, "please", remainder)
}

func TestMatcher_WhenUnknownBang_ExpectNoMatch(t *testing.T) {
	t.Parallel()

	m := command.NewMatcher(openTestStore(t))

	_, ok := m.Lookup("!foo")
	require.False(t, ok)
}

func TestMatcher_WhenGGWithinCooldown_ExpectOneFire(t *testing.T) {
	t.Parallel()

	m := command.NewMatcher(openTestStore(t))

	cmd, ok := m.Lookup("!gg")
	require.True(t, ok)
	require.Equal(t, "gg", cmd.Trigger)

	require.True(t, m.TryFire("twitch", "viewer-1", cmd))
	require.False(t, m.TryFire("twitch", "viewer-1", cmd))
}

func TestMatcher_WhenCooldownElapsed_ExpectSecondFire(t *testing.T) {
	t.Parallel()

	s := openTestStore(t)
	m := command.NewMatcher(s)

	updated, err := s.UpdateCommand(store.UpdateCommandInput{
		ID:              "gg",
		Trigger:         "gg",
		Enabled:         true,
		CooldownSeconds: 1,
		SplashTemplate:  "Good game, {viewer}!",
		Sound:           "chime",
		DurationMs:      5000,
	})
	require.NoError(t, err)

	cmd, ok := m.Lookup("!gg")
	require.True(t, ok)
	require.Equal(t, updated.ID, cmd.ID)

	require.True(t, m.TryFire("twitch", "viewer-1", cmd))
	require.False(t, m.TryFire("twitch", "viewer-1", cmd))

	time.Sleep(1100 * time.Millisecond)

	require.True(t, m.TryFire("twitch", "viewer-1", cmd))
}

func TestMatcher_WhenNew_ExpectNoOutcomes(t *testing.T) {
	t.Parallel()

	m := command.NewMatcher(openTestStore(t))
	_, ok := m.MessageOutcome("twitch", "msg-1")
	require.False(t, ok)
}

func TestMatcher_WhenOutcomeRecorded_ExpectRestoreWithRemainingMs(t *testing.T) {
	t.Parallel()

	m := command.NewMatcher(openTestStore(t))
	cmd, ok := m.Lookup("!gg")
	require.True(t, ok)

	require.True(t, m.TryFire("twitch", "viewer-1", cmd))
	outcome := m.RecordMessageOutcome("twitch", "msg-fired", "twitch", "viewer-1", cmd, true)
	require.Equal(t, "gg", outcome.Trigger)
	require.Equal(t, command.OutcomeStatusFired, outcome.Status)
	require.Greater(t, outcome.CooldownRemainingMs, 0)

	restored, ok := m.MessageOutcome("twitch", "msg-fired")
	require.True(t, ok)
	require.Equal(t, outcome.Trigger, restored.Trigger)
	require.Equal(t, command.OutcomeStatusFired, restored.Status)
	require.Greater(t, restored.CooldownRemainingMs, 0)

	require.False(t, m.TryFire("twitch", "viewer-1", cmd))
	cooldownOutcome := m.RecordMessageOutcome("twitch", "msg-cooldown", "twitch", "viewer-1", cmd, false)
	require.Equal(t, command.OutcomeStatusCooldown, cooldownOutcome.Status)
	require.Greater(t, cooldownOutcome.CooldownRemainingMs, 0)

	cooldownRestored, ok := m.MessageOutcome("twitch", "msg-cooldown")
	require.True(t, ok)
	require.Equal(t, command.OutcomeStatusCooldown, cooldownRestored.Status)
	require.Greater(t, cooldownRestored.CooldownRemainingMs, 0)
}
