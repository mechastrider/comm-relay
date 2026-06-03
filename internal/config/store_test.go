package config

import (
	"path/filepath"
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
