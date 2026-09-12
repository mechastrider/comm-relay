package packimport_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/packimport"
	"github.com/mechastrider/comm-relay/internal/store"
)

func writeGreetingPackDir(t *testing.T, withMedia bool) string {
	t.Helper()

	dir := t.TempDir()
	mediaLines := ""
	if withMedia {
		require.NoError(t, os.MkdirAll(filepath.Join(dir, "images"), 0o755))
		require.NoError(t, os.WriteFile(filepath.Join(dir, "images", "jake-new-viewer.png"), tinyPNGBytes(), 0o644))
		require.NoError(t, os.MkdirAll(filepath.Join(dir, "audio"), 0o755))
		require.NoError(t, os.WriteFile(filepath.Join(dir, "audio", "jake-new-viewer.wav"), writeTestWAV(3, 44100), 0o644))
		mediaLines = `    image: images/jake-new-viewer.png
    audio: audio/jake-new-viewer.wav
    sound: chime
`
	}

	packYAML := `schema_version: 1
pack:
  slug: test-pack
  title: Test
  locale: ru-RU
defaults:
  enabled: true
  layout: fullscreen
  image_fit: contain
  sound_volume: 70
  image_size_pct: 100
greetings:
  - id: new_viewer
    splash: "Новый мехвоин прибыл: {viewer}. Добро пожаловать на борт!"
` + mediaLines + `    duration_ms: 12000
commands:
  - trigger: gg
    splash: "Good game"
    duration_ms: 5000
    cooldown_seconds: 30
    image: images/jake-gg.png
`
	require.NoError(t, os.MkdirAll(filepath.Join(dir, "images"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "images", "jake-gg.png"), tinyPNGBytes(), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "pack.yaml"), []byte(packYAML), 0o644))
	return dir
}

func TestPlanGreetingApplyUpdatesSplash(t *testing.T) {
	pack := &packimport.Pack{
		SchemaVersion: 1,
		Pack:          packimport.PackMeta{Slug: "test"},
		Defaults: packimport.CommandDefaults{
			Enabled:      boolPtr(true),
			Layout:       "fullscreen",
			ImageFit:     "contain",
			SoundVolume:  intPtr(70),
			ImageSizePct: intPtr(100),
		},
		Greetings: []packimport.GreetingSpec{
			{
				ID:     "new_viewer",
				Splash: "Новый мехвоин прибыл: {viewer}. Добро пожаловать на борт!",
			},
		},
	}

	existing := []store.Greeting{
		{
			ID:             store.GreetingNewViewer,
			Enabled:        false,
			SplashTemplate: "Добро пожаловать, {viewer}!",
			DurationMs:     5000,
			SoundVolume:    70,
			Layout:         "card",
			ImageFit:       "contain",
			ImageSizePct:   100,
		},
		{
			ID:             store.GreetingReturningViewer,
			Enabled:        false,
			SplashTemplate: "С возвращением, {viewer}!",
			DurationMs:     5000,
			SoundVolume:    70,
			Layout:         "card",
			ImageFit:       "contain",
			ImageSizePct:   100,
		},
	}

	planned := packimport.PlanGreetingApply(pack, existing, packimport.ApplyOptions{})
	require.Len(t, planned, 1)
	require.Equal(t, packimport.ActionUpdate, planned[0].Kind)
	require.Equal(t, "new_viewer", planned[0].ID)
}

func TestPlanGreetingApplyUpdatesWhenImageMissing(t *testing.T) {
	packDir := writeGreetingPackDir(t, true)
	pack, err := packimport.LoadPackDir(packDir)
	require.NoError(t, err)

	existing := []store.Greeting{
		{
			ID:             store.GreetingNewViewer,
			Enabled:        true,
			SplashTemplate: "Новый мехвоин прибыл: {viewer}. Добро пожаловать на борт!",
			Sound:          "chime",
			DurationMs:     12000,
			SoundFile:      "asset_existing.mp3",
			SoundVolume:    70,
			Layout:         "fullscreen",
			ImageFit:       "contain",
			ImageSizePct:   100,
		},
	}

	planned := packimport.PlanGreetingApply(pack, existing, packimport.ApplyOptions{})
	require.Len(t, planned, 1)
	require.Equal(t, packimport.ActionUpdate, planned[0].Kind)
}

func TestPlanGreetingApplySkipUnchanged(t *testing.T) {
	pack := &packimport.Pack{
		SchemaVersion: 1,
		Pack:          packimport.PackMeta{Slug: "test"},
		Defaults: packimport.CommandDefaults{
			Enabled:      boolPtr(true),
			Layout:       "fullscreen",
			ImageFit:     "contain",
			SoundVolume:  intPtr(70),
			ImageSizePct: intPtr(100),
		},
		Greetings: []packimport.GreetingSpec{
			{
				ID:         "returning_viewer",
				Splash:     "С возвращением, {viewer}!",
				DurationMs: 5000,
			},
		},
	}

	existing := []store.Greeting{
		{
			ID:             store.GreetingReturningViewer,
			Enabled:        true,
			SplashTemplate: "С возвращением, {viewer}!",
			DurationMs:     5000,
			SoundVolume:    70,
			Layout:         "fullscreen",
			ImageFit:       "contain",
			ImageSizePct:   100,
		},
	}

	planned := packimport.PlanGreetingApply(pack, existing, packimport.ApplyOptions{})
	require.Len(t, planned, 1)
	require.Equal(t, packimport.ActionSkip, planned[0].Kind)
}

func TestApplyImportsGreetingSplash(t *testing.T) {
	packDir := writeGreetingPackDir(t, false)
	pack, err := packimport.LoadPackDir(packDir)
	require.NoError(t, err)
	require.NoError(t, packimport.ValidatePack(pack))

	root := t.TempDir()
	assetsDir := filepath.Join(root, "overlay-assets")
	dbPath := filepath.Join(root, "comm-relay.db")

	s, err := store.Open(dbPath, store.OpenOptions{TimeLocale: "ru-RU"})
	require.NoError(t, err)
	t.Cleanup(func() { _ = s.Close() })

	result, err := packimport.Apply(pack, s, assetsDir, packimport.ApplyOptions{})
	require.NoError(t, err)
	require.Equal(t, 2, result.Applied+result.AppliedGreetings)

	greeting, err := s.GetGreeting(store.GreetingNewViewer)
	require.NoError(t, err)
	require.True(t, greeting.Enabled)
	require.Equal(t, "Новый мехвоин прибыл: {viewer}. Добро пожаловать на борт!", greeting.SplashTemplate)
	require.Equal(t, 12000, greeting.DurationMs)
	require.Equal(t, "fullscreen", greeting.Layout)
}

func TestApplyImportsGreetingMedia(t *testing.T) {
	packDir := writeGreetingPackDir(t, true)
	pack, err := packimport.LoadPackDir(packDir)
	require.NoError(t, err)
	require.NoError(t, packimport.ValidatePack(pack))

	root := t.TempDir()
	assetsDir := filepath.Join(root, "overlay-assets")
	dbPath := filepath.Join(root, "comm-relay.db")

	s, err := store.Open(dbPath, store.OpenOptions{TimeLocale: "ru-RU"})
	require.NoError(t, err)
	t.Cleanup(func() { _ = s.Close() })

	result, err := packimport.Apply(pack, s, assetsDir, packimport.ApplyOptions{})
	require.NoError(t, err)
	require.Equal(t, 2, result.Applied+result.AppliedGreetings)

	greeting, err := s.GetGreeting(store.GreetingNewViewer)
	require.NoError(t, err)
	require.NotEmpty(t, greeting.ImageAsset)
	require.NotEmpty(t, greeting.SoundFile)
	require.Equal(t, "chime", greeting.Sound)
}
