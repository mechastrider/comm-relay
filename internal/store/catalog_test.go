package store_test

import (
	"testing"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/store"
)

func TestCommands_WhenFreshDatabase_ExpectSeedRows(t *testing.T) {
	s, _ := openTestStore(t)

	commands, err := s.ListCommands()
	require.NoError(t, err)
	require.Len(t, commands, 2)

	triggers := map[string]store.Command{}
	for _, cmd := range commands {
		triggers[cmd.Trigger] = cmd
	}

	gg, ok := triggers["gg"]
	require.True(t, ok)
	assert.Equal(t, "gg", gg.ID)
	assert.True(t, gg.Enabled)
	assert.Equal(t, 30, gg.CooldownSeconds)
	assert.Equal(t, "Good game, {name}!", gg.SplashTemplate)
	assert.Equal(t, "chime", gg.Sound)
	assert.Equal(t, 5000, gg.DurationMs)

	hi, ok := triggers["hi"]
	require.True(t, ok)
	assert.Equal(t, "hi", hi.ID)
	assert.Equal(t, "ping", hi.Sound)

	awards, err := s.ListAwards()
	require.NoError(t, err)
	require.Len(t, awards, 2)

	byID := map[string]store.AwardType{}
	for _, award := range awards {
		byID[award.ID] = award
	}

	joke := byID["joke"]
	assert.Equal(t, "Joke", joke.Name)
	assert.Equal(t, 10, joke.Points)
	assert.Equal(t, "soft", joke.Sound)

	advice := byID["advice"]
	assert.Equal(t, "Advice", advice.Name)
	assert.Equal(t, 50, advice.Points)
	assert.Equal(t, "alert", advice.Sound)
}

func TestCommands_WhenDeleteSeedAndReopen_ExpectStillAbsent(t *testing.T) {
	s, path := openTestStore(t)

	require.NoError(t, s.DeleteCommand("gg"))
	require.NoError(t, s.Close())

	reopened, err := store.Open(path)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, reopened.Close())
	})

	commands, err := reopened.ListCommands()
	require.NoError(t, err)

	for _, cmd := range commands {
		assert.NotEqual(t, "gg", cmd.Trigger)
		assert.NotEqual(t, "gg", cmd.ID)
	}
}

func TestCommands_WhenDuplicateTrigger_ExpectError(t *testing.T) {
	s, _ := openTestStore(t)

	_, err := s.CreateCommand(store.CreateCommandInput{
		Trigger:         "gg",
		Enabled:         true,
		CooldownSeconds: 0,
		SplashTemplate:  "dup",
		Sound:           "",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, store.ErrDuplicateTrigger))
}

func TestCommands_WhenInvalidTrigger_ExpectError(t *testing.T) {
	s, _ := openTestStore(t)

	_, err := s.CreateCommand(store.CreateCommandInput{
		Trigger:         "!gg",
		Enabled:         true,
		CooldownSeconds: 0,
		SplashTemplate:  "bad",
		Sound:           "",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, store.ErrInvalidTrigger))

	_, err = s.CreateCommand(store.CreateCommandInput{
		Trigger:         "ab-cd",
		Enabled:         true,
		CooldownSeconds: 0,
		SplashTemplate:  "bad",
		Sound:           "",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, store.ErrInvalidTrigger))
}

func TestAwards_WhenPointsZero_ExpectError(t *testing.T) {
	s, _ := openTestStore(t)

	_, err := s.CreateAward(store.CreateAwardInput{
		Name:           "Empty",
		Points:         0,
		SplashTemplate: "nope",
		Sound:          "",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, store.ErrInvalidPoints))
}

func TestAwards_WhenDeleteSeedAndReopen_ExpectStillAbsent(t *testing.T) {
	s, path := openTestStore(t)

	require.NoError(t, s.DeleteAward("joke"))
	require.NoError(t, s.Close())

	reopened, err := store.Open(path)
	require.NoError(t, err)
	t.Cleanup(func() {
		require.NoError(t, reopened.Close())
	})

	awards, err := reopened.ListAwards()
	require.NoError(t, err)

	for _, award := range awards {
		assert.NotEqual(t, "joke", award.ID)
	}
}
