package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"testing"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/require"
)

func TestStore_WhenSurfaceOpacityOverridesSaved_ExpectRestartRoundTrip(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	cfg, err := Load(path)
	require.NoError(t, err)
	store, err := NewStore(path, cfg)
	require.NoError(t, err)

	zero, middle, one := 0.0, 0.35, 1.0
	require.NoError(t, store.Mutate(func(current *Config) error {
		current.Overlay.Presets[0].Surfaces.Chat.PanelOpacity = &zero
		current.Overlay.Presets[0].Surfaces.Leaderboard.PanelOpacity = &middle
		current.Overlay.Presets[0].Surfaces.Alerts.PanelOpacity = &one
		current.Twitch.Channel = "unrelated-setting"
		return nil
	}))

	reloaded, err := Load(path)
	require.NoError(t, err)
	preset := reloaded.Overlay.Presets[0]
	require.Equal(t, 0.0, preset.ChatPanelOpacity())
	require.Equal(t, 0.35, preset.LeaderboardPanelOpacity())
	require.Equal(t, 1.0, preset.AlertsPanelOpacity())
	require.Equal(t, "unrelated-setting", reloaded.Twitch.Channel)

	// A prior binary's smaller JSON view ignores additive surface fields and
	// still retains the shared fallback it understands.
	disk, err := os.ReadFile(path)
	require.NoError(t, err)
	var legacy struct {
		Overlay struct {
			Presets []struct {
				Style struct {
					PanelOpacity float64 `json:"panel_opacity"`
				} `json:"style"`
			} `json:"presets"`
		} `json:"overlay"`
	}
	require.NoError(t, json.Unmarshal(disk, &legacy))
	require.Equal(t, 0.58, legacy.Overlay.Presets[0].Style.PanelOpacity)
}

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
