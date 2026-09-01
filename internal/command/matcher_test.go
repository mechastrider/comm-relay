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
	s, err := store.Open(path)
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })

	return s
}

func TestParseLine_WhenBangGG_ExpectTrigger(t *testing.T) {
	t.Parallel()

	trigger, ok := command.ParseLine("  !GG  ")
	require.True(t, ok)
	require.Equal(t, "gg", trigger)
}

func TestParseLine_WhenNoBang_ExpectNoMatch(t *testing.T) {
	t.Parallel()

	_, ok := command.ParseLine("gg")
	require.False(t, ok)
}

func TestParseLine_WhenExtraWords_ExpectNoMatch(t *testing.T) {
	t.Parallel()

	_, ok := command.ParseLine("!gg please")
	require.False(t, ok)
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
		SplashTemplate:  "Good game, {name}!",
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

func TestSubstituteTemplate_WhenCommand_ExpectNameAndZeroPoints(t *testing.T) {
	t.Parallel()

	text := command.SubstituteTemplate("Good game, {name}! +{points}", "Alice", 0)
	require.Equal(t, "Good game, Alice! +0", text)
}
