package store_test

import (
	"strings"
	"testing"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestCommands_WhenCreateWithAliases_ExpectRoundTrip(t *testing.T) {
	s, _ := openTestStore(t)

	created, err := s.CreateCommand(store.CreateCommandInput{
		Trigger:         "heat",
		Aliases:         []string{"heater", "warm"},
		Enabled:         true,
		CooldownSeconds: 0,
		SplashTemplate:  "hot",
		Sound:           "",
	})
	require.NoError(t, err)
	require.Equal(t, []string{"heater", "warm"}, created.Aliases)

	loaded, err := s.GetCommand(created.ID)
	require.NoError(t, err)
	require.Equal(t, []string{"heater", "warm"}, loaded.Aliases)

	commands, err := s.ListCommands()
	require.NoError(t, err)
	var found store.Command
	for _, cmd := range commands {
		if cmd.ID == created.ID {
			found = cmd
			break
		}
	}
	require.Equal(t, []string{"heater", "warm"}, found.Aliases)
}

func TestCommands_WhenUpdateReplacesAliases_ExpectNewSet(t *testing.T) {
	s, _ := openTestStore(t)

	created, err := s.CreateCommand(store.CreateCommandInput{
		Trigger:         "alpha",
		Aliases:         []string{"a"},
		Enabled:         true,
		CooldownSeconds: 0,
		SplashTemplate:  "x",
		Sound:           "",
	})
	require.NoError(t, err)

	updated, err := s.UpdateCommand(store.UpdateCommandInput{
		ID:              created.ID,
		Trigger:         "alpha",
		Aliases:         []string{"alt"},
		Enabled:         true,
		CooldownSeconds: 0,
		SplashTemplate:  "x",
		Sound:           "",
	})
	require.NoError(t, err)
	require.Equal(t, []string{"alt"}, updated.Aliases)
}

func TestCommands_WhenOmittedAliases_ExpectEmptyList(t *testing.T) {
	s, _ := openTestStore(t)

	gg, err := s.GetCommand("gg")
	require.NoError(t, err)
	require.Equal(t, []string{}, gg.Aliases)
}

func TestCommands_WhenDeleteCommand_ExpectAliasesCascade(t *testing.T) {
	s, _ := openTestStore(t)

	created, err := s.CreateCommand(store.CreateCommandInput{
		Trigger:         "dropme",
		Aliases:         []string{"gone"},
		Enabled:         true,
		CooldownSeconds: 0,
		SplashTemplate:  "bye",
		Sound:           "",
	})
	require.NoError(t, err)

	require.NoError(t, s.DeleteCommand(created.ID))

	commands, err := s.ListCommands()
	require.NoError(t, err)
	for _, cmd := range commands {
		assert.NotEqual(t, "gone", cmd.Trigger)
		for _, alias := range cmd.Aliases {
			assert.NotEqual(t, "gone", alias)
		}
	}
}

func TestCommands_WhenAliasMatchesOtherTrigger_ExpectDuplicateAlias(t *testing.T) {
	s, _ := openTestStore(t)

	_, err := s.CreateCommand(store.CreateCommandInput{
		Trigger:         "other",
		Aliases:         []string{"hi"},
		Enabled:         true,
		CooldownSeconds: 0,
		SplashTemplate:  "x",
		Sound:           "",
	})
	require.ErrorIs(t, err, store.ErrDuplicateAlias)
}

func TestCommands_WhenAliasMatchesOtherAlias_ExpectDuplicateAlias(t *testing.T) {
	s, _ := openTestStore(t)

	_, err := s.CreateCommand(store.CreateCommandInput{
		Trigger:         "base",
		Aliases:         []string{"nick"},
		Enabled:         true,
		CooldownSeconds: 0,
		SplashTemplate:  "x",
		Sound:           "",
	})
	require.NoError(t, err)

	_, err = s.CreateCommand(store.CreateCommandInput{
		Trigger:         "second",
		Aliases:         []string{"nick"},
		Enabled:         true,
		CooldownSeconds: 0,
		SplashTemplate:  "y",
		Sound:           "",
	})
	require.ErrorIs(t, err, store.ErrDuplicateAlias)
}

func TestCommands_WhenTriggerMatchesOtherAlias_ExpectDuplicateTrigger(t *testing.T) {
	s, _ := openTestStore(t)

	_, err := s.CreateCommand(store.CreateCommandInput{
		Trigger:         "owned",
		Aliases:         []string{"taken"},
		Enabled:         true,
		CooldownSeconds: 0,
		SplashTemplate:  "x",
		Sound:           "",
	})
	require.NoError(t, err)

	_, err = s.CreateCommand(store.CreateCommandInput{
		Trigger:         "taken",
		Enabled:         true,
		CooldownSeconds: 0,
		SplashTemplate:  "y",
		Sound:           "",
	})
	require.ErrorIs(t, err, store.ErrDuplicateTrigger)
}

func TestCommands_WhenAliasEqualsOwnTrigger_ExpectAliasMatchesTrigger(t *testing.T) {
	s, _ := openTestStore(t)

	_, err := s.CreateCommand(store.CreateCommandInput{
		Trigger:         "same",
		Aliases:         []string{"same"},
		Enabled:         true,
		CooldownSeconds: 0,
		SplashTemplate:  "x",
		Sound:           "",
	})
	require.ErrorIs(t, err, store.ErrAliasMatchesTrigger)
}

func TestCommands_WhenTooManyAliases_ExpectError(t *testing.T) {
	s, _ := openTestStore(t)

	aliases := make([]string, 17)
	for i := range aliases {
		aliases[i] = "a" + strings.Repeat("b", i)
		if len(aliases[i]) > 32 {
			aliases[i] = aliases[i][:32]
		}
	}
	// Use distinct valid slugs
	aliases = []string{
		"a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8",
		"a9", "b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8",
	}

	_, err := s.CreateCommand(store.CreateCommandInput{
		Trigger:         "many",
		Aliases:         aliases,
		Enabled:         true,
		CooldownSeconds: 0,
		SplashTemplate:  "x",
		Sound:           "",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, store.ErrTooManyAliases))
}

func TestCommands_WhenDuplicateAliasInRequest_ExpectInvalidAlias(t *testing.T) {
	s, _ := openTestStore(t)

	_, err := s.CreateCommand(store.CreateCommandInput{
		Trigger:         "dup",
		Aliases:         []string{"twice", "twice"},
		Enabled:         true,
		CooldownSeconds: 0,
		SplashTemplate:  "x",
		Sound:           "",
	})
	require.ErrorIs(t, err, store.ErrInvalidAlias)
}
