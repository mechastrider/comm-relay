package command_test

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/command"
	"github.com/mechastrider/comm-relay/internal/store"
)

func createAlertCommand(t *testing.T, s *store.Store, input store.CreateCommandInput) *store.Command {
	t.Helper()
	if input.SplashTemplate == "" {
		input.SplashTemplate = "ok"
	}
	created, err := s.CreateCommand(input)
	require.NoError(t, err)
	return created
}

func TestMatcher_WhenAliasHeate_ExpectHeatExactAlias(t *testing.T) {
	t.Parallel()

	s := openTestStore(t)
	createAlertCommand(t, s, store.CreateCommandInput{
		Trigger: "heat",
		Aliases: []string{"heate"},
		Enabled: true,
		Sound:   "chime",
	})

	m := command.NewMatcher(s)
	match, ok := m.LookupMatch("!heate")
	require.True(t, ok)
	require.NotNil(t, match.Command)
	require.Equal(t, "heat", match.Command.Trigger)
	require.Equal(t, command.MatchKindAlias, match.Kind)
}

func TestMatcher_WhenAliasFired_ExpectSharedCooldown(t *testing.T) {
	t.Parallel()

	s := openTestStore(t)
	cmd := createAlertCommand(t, s, store.CreateCommandInput{
		Trigger:         "heat",
		Aliases:         []string{"heate"},
		Enabled:         true,
		CooldownSeconds: 60,
		Sound:           "chime",
	})

	m := command.NewMatcher(s)
	aliasMatch, ok := m.LookupMatch("!heate")
	require.True(t, ok)
	require.Equal(t, cmd.ID, aliasMatch.Command.ID)

	canonical, ok := m.Lookup("!heat")
	require.True(t, ok)
	require.Equal(t, cmd.ID, canonical.ID)

	require.True(t, m.TryFire("twitch", "viewer-1", canonical))
	require.False(t, m.TryFire("twitch", "viewer-1", aliasMatch.Command))
}

func TestMatcher_WhenDisabledHeatWithAlias_ExpectMiss(t *testing.T) {
	t.Parallel()

	s := openTestStore(t)
	createAlertCommand(t, s, store.CreateCommandInput{
		Trigger: "heat",
		Aliases: []string{"heate"},
		Enabled: false,
		Sound:   "chime",
	})

	m := command.NewMatcher(s)
	_, ok := m.Lookup("!heate")
	require.False(t, ok)
}

func TestMatcher_WhenUniqueTypoHeate_ExpectFuzzyHeat(t *testing.T) {
	t.Parallel()

	s := openTestStore(t)
	createAlertCommand(t, s, store.CreateCommandInput{
		Trigger: "heat",
		Enabled: true,
		Sound:   "chime",
	})

	m := command.NewMatcher(s)
	match, ok := m.LookupMatch("!heate")
	require.True(t, ok)
	require.NotNil(t, match.Command)
	require.Equal(t, "heat", match.Command.Trigger)
	require.Equal(t, command.MatchKindFuzzy, match.Kind)
}

func TestMatcher_WhenShortSeedGo_ExpectMiss(t *testing.T) {
	t.Parallel()

	m := command.NewMatcher(openTestStore(t))
	_, ok := m.Lookup("!go")
	require.False(t, ok)
}

func TestMatcher_WhenAmbiguousNeighbors_ExpectMiss(t *testing.T) {
	t.Parallel()

	s := openTestStore(t)
	createAlertCommand(t, s, store.CreateCommandInput{
		Trigger: "heat",
		Enabled: true,
		Sound:   "chime",
	})
	createAlertCommand(t, s, store.CreateCommandInput{
		Trigger: "heal",
		Enabled: true,
		Sound:   "chime",
	})

	m := command.NewMatcher(s)
	match, ok := m.LookupMatch("!heam")
	require.True(t, ok)
	require.Nil(t, match.Command)
	require.True(t, match.AmbiguousTypo)
}

func TestMatcher_WhenExtraWords_ExpectMiss(t *testing.T) {
	t.Parallel()

	s := openTestStore(t)
	createAlertCommand(t, s, store.CreateCommandInput{
		Trigger: "heat",
		Enabled: true,
		Sound:   "chime",
	})

	m := command.NewMatcher(s)
	_, ok := m.Lookup("!heat please")
	require.False(t, ok)
}

func TestMatcher_WhenTranspositionTypo_ExpectFuzzy(t *testing.T) {
	t.Parallel()

	s := openTestStore(t)
	createAlertCommand(t, s, store.CreateCommandInput{
		Trigger: "heat",
		Enabled: true,
		Sound:   "chime",
	})

	m := command.NewMatcher(s)
	match, ok := m.LookupMatch("!haet")
	require.True(t, ok)
	require.NotNil(t, match.Command)
	require.Equal(t, "heat", match.Command.Trigger)
	require.Equal(t, command.MatchKindFuzzy, match.Kind)
}

func TestMatcher_WhenTypoOfLongAlias_ExpectFuzzy(t *testing.T) {
	t.Parallel()

	s := openTestStore(t)
	createAlertCommand(t, s, store.CreateCommandInput{
		Trigger: "heat",
		Aliases: []string{"heater"},
		Enabled: true,
		Sound:   "chime",
	})

	m := command.NewMatcher(s)
	match, ok := m.LookupMatch("!heate")
	require.True(t, ok)
	require.NotNil(t, match.Command)
	require.Equal(t, "heat", match.Command.Trigger)
	require.Equal(t, command.MatchKindFuzzy, match.Kind)
}
