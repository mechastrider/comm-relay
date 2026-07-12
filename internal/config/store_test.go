package config

import (
	"path/filepath"
	"sync"
	"testing"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/require"
)

func TestStore_WhenReplaceValid_ExpectPersisted(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")

	cfg, err := Load(path)
	require.NoError(t, err)

	store, err := NewStore(path, cfg)
	require.NoError(t, err)

	updated := store.Snapshot()
	updated.Twitch.Enabled = true
	updated.Twitch.Channel = "streamer"

	require.NoError(t, store.Replace(updated))

	snapshot := store.Snapshot()
	require.True(t, snapshot.Twitch.Enabled)
	require.Equal(t, "streamer", snapshot.Twitch.Channel)

	reloaded, err := Load(path)
	require.NoError(t, err)
	require.Equal(t, snapshot.Twitch.Channel, reloaded.Twitch.Channel)
}

func TestStore_WhenReplaceInvalid_ExpectErrorAndUnchanged(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")

	cfg, err := Load(path)
	require.NoError(t, err)

	store, err := NewStore(path, cfg)
	require.NoError(t, err)

	invalid := store.Snapshot()
	invalid.Twitch.Enabled = true
	invalid.Twitch.Channel = ""

	err = store.Replace(invalid)
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrInvalidConfig))
	require.False(t, store.Snapshot().Twitch.Enabled)
}

func TestStore_WhenReplaceAndMutateConcurrent_ExpectMemoryMatchesDisk(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")

	cfg, err := Load(path)
	require.NoError(t, err)

	store, err := NewStore(path, cfg)
	require.NoError(t, err)

	const iterations = 40
	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		defer wg.Done()
		for i := 0; i < iterations; i++ {
			next := store.Snapshot()
			next.Twitch.Enabled = true
			next.Twitch.Channel = "replace-channel"
			require.NoError(t, store.Replace(next))
		}
	}()

	go func() {
		defer wg.Done()
		for i := 0; i < iterations; i++ {
			require.NoError(t, store.Mutate(func(current *Config) error {
				current.YouTube.OAuth.RefreshToken = "mutated-token"
				return nil
			}))
		}
	}()

	wg.Wait()

	snapshot := store.Snapshot()
	reloaded, err := Load(path)
	require.NoError(t, err)
	require.Equal(t, snapshot.Twitch.Enabled, reloaded.Twitch.Enabled)
	require.Equal(t, snapshot.Twitch.Channel, reloaded.Twitch.Channel)
	require.Equal(t, snapshot.YouTube.OAuth.RefreshToken, reloaded.YouTube.OAuth.RefreshToken)
	require.Equal(t, "mutated-token", snapshot.YouTube.OAuth.RefreshToken)
	require.Equal(t, "replace-channel", snapshot.Twitch.Channel)
}
