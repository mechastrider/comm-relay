package config

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/require"
)

func testStoreWithSecondPreset(t *testing.T) (*Store, Config) {
	t.Helper()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")

	cfg, err := Load(path)
	require.NoError(t, err)

	store, err := NewStore(path, cfg)
	require.NoError(t, err)

	require.NoError(t, store.Mutate(func(current *Config) error {
		streamMain := current.Overlay.Presets[0]
		streamMain.ID = "stream-main"
		streamMain.Name = "Stream Main"
		streamMain.Theme = OverlayThemeDashboard
		streamMain.MaxMessages = 15
		streamMain.MessageTTLSeconds = 12
		streamMain.FontSizePx = 20
		streamMain.DisplayMode = OverlayDisplayModeCompact
		current.Overlay.Presets = append(current.Overlay.Presets, streamMain)
		return nil
	}))

	return store, store.Snapshot()
}

func assertUnrelatedConfigUnchanged(t *testing.T, before, after Config) {
	t.Helper()

	require.Equal(t, before.ServerPort, after.ServerPort)
	require.Equal(t, before.PointsPerMessage, after.PointsPerMessage)
	require.Equal(t, before.DayResetHour, after.DayResetHour)
	require.Equal(t, before.Network, after.Network)
	require.Equal(t, before.Twitch, after.Twitch)
	require.Equal(t, before.YouTube, after.YouTube)
	require.Equal(t, before.VK, after.VK)
	require.Equal(t, before.Admin, after.Admin)
	require.Equal(t, before.Logging, after.Logging)
	require.Equal(t, before.Overlay.Emotes, after.Overlay.Emotes)
	require.Equal(t, before.Overlay.ImagePreviews, after.Overlay.ImagePreviews)
	require.Equal(t, before.Overlay.Presets, after.Overlay.Presets)
	require.Equal(t, before.Overlay.PageOpacity, after.Overlay.PageOpacity)
}

func TestStore_ActivatePreset_WhenValid_ExpectOnlyActiveAndMirroredFieldsChange(t *testing.T) {
	t.Parallel()

	store, before := testStoreWithSecondPreset(t)
	path := store.Path()

	require.NoError(t, store.ActivatePreset("stream-main"))

	after := store.Snapshot()
	require.Equal(t, "stream-main", after.Overlay.ActivePresetID)
	require.Equal(t, OverlayThemeDashboard, after.Overlay.Theme)
	require.Equal(t, 15, after.Overlay.MaxMessages)
	require.Equal(t, 12, after.Overlay.MessageTTLSeconds)
	require.Equal(t, 20, after.Overlay.FontSizePx)
	require.Equal(t, OverlayDisplayModeCompact, after.Overlay.DisplayMode)

	assertUnrelatedConfigUnchanged(t, before, after)

	reloaded, err := Load(path)
	require.NoError(t, err)
	require.Equal(t, "stream-main", reloaded.Overlay.ActivePresetID)
}

func TestStore_ActivatePreset_WhenBlank_ExpectErrorAndUnchanged(t *testing.T) {
	t.Parallel()

	store, before := testStoreWithSecondPreset(t)
	path := store.Path()

	err := store.ActivatePreset("   ")
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrBlankPresetID))

	after := store.Snapshot()
	require.Equal(t, before, after)

	reloaded, err := Load(path)
	require.NoError(t, err)
	require.Equal(t, before.Overlay.ActivePresetID, reloaded.Overlay.ActivePresetID)
}

func TestStore_ActivatePreset_WhenUnknown_ExpectErrorAndUnchanged(t *testing.T) {
	t.Parallel()

	store, before := testStoreWithSecondPreset(t)
	path := store.Path()

	err := store.ActivatePreset("missing-preset")
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrUnknownPresetID))

	after := store.Snapshot()
	require.Equal(t, before, after)

	reloaded, err := Load(path)
	require.NoError(t, err)
	require.Equal(t, before.Overlay.ActivePresetID, reloaded.Overlay.ActivePresetID)
}

func TestStore_ActivatePreset_WhenSecretBearing_ExpectSecretsPreserved(t *testing.T) {
	t.Parallel()

	store, _ := testStoreWithSecondPreset(t)

	require.NoError(t, store.Mutate(func(current *Config) error {
		current.YouTube.OAuth.ClientID = "client-id"
		current.YouTube.OAuth.ClientSecret = "top-secret"
		current.YouTube.OAuth.RefreshToken = "refresh-token"
		current.Network.SOCKS5.Address = "127.0.0.1:1080"
		current.Network.SOCKS5.Username = "proxy-user"
		current.Network.SOCKS5.Password = "proxy-secret"
		return nil
	}))
	before := store.Snapshot()

	require.NoError(t, store.ActivatePreset("stream-main"))

	after := store.Snapshot()
	require.Equal(t, "top-secret", after.YouTube.OAuth.ClientSecret)
	require.Equal(t, "refresh-token", after.YouTube.OAuth.RefreshToken)
	require.Equal(t, "proxy-secret", after.Network.SOCKS5.Password)
	assertUnrelatedConfigUnchanged(t, before, after)
}

func TestStore_ActivatePreset_WhenSaveFails_ExpectErrorAndUnchanged(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")

	cfg, err := Load(path)
	require.NoError(t, err)

	store, err := NewStore(path, cfg)
	require.NoError(t, err)

	require.NoError(t, store.Mutate(func(current *Config) error {
		streamMain := current.Overlay.Presets[0]
		streamMain.ID = "stream-main"
		streamMain.Name = "Stream Main"
		current.Overlay.Presets = append(current.Overlay.Presets, streamMain)
		return nil
	}))

	require.NoError(t, store.ActivatePreset("stream-main"))
	activated := store.Snapshot()
	require.Equal(t, "stream-main", activated.Overlay.ActivePresetID)

	require.NoError(t, os.Chmod(dir, 0o555))
	t.Cleanup(func() { _ = os.Chmod(dir, 0o755) })

	err = store.ActivatePreset(OverlayDefaultPresetID)
	if err == nil {
		blocker := filepath.Join(dir, "blocker")
		require.NoError(t, os.WriteFile(blocker, []byte("x"), 0o644))
		badPath := filepath.Join(blocker, "config.json")
		blockedStore, storeErr := NewStore(badPath, cfg)
		require.NoError(t, storeErr)
		require.NoError(t, blockedStore.Mutate(func(current *Config) error {
			streamMain := current.Overlay.Presets[0]
			streamMain.ID = "stream-main"
			streamMain.Name = "Stream Main"
			current.Overlay.Presets = append(current.Overlay.Presets, streamMain)
			return nil
		}))
		require.NoError(t, blockedStore.ActivatePreset("stream-main"))
		beforeBlocked := blockedStore.Snapshot()
		err = blockedStore.ActivatePreset(OverlayDefaultPresetID)
		require.Error(t, err)
		require.Equal(t, beforeBlocked, blockedStore.Snapshot())
		return
	}

	require.Equal(t, activated, store.Snapshot())

	reloaded, reloadErr := Load(path)
	require.NoError(t, reloadErr)
	require.Equal(t, activated.Overlay.ActivePresetID, reloaded.Overlay.ActivePresetID)
}
