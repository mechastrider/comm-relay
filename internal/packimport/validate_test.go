package packimport_test

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/packimport"
)

func mw5JakePackDir(t *testing.T) string {
	t.Helper()

	_, file, _, ok := runtime.Caller(0)
	require.True(t, ok)

	candidates := []string{
		filepath.Join(filepath.Dir(file), "..", "..", "..", "comm-relay-packs", "packs", "mw5-jake"),
		filepath.Clean(`C:\apps\comm-relay-packs\packs\mw5-jake`),
	}
	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}

	t.Skip("mw5-jake pack directory not found")
	return ""
}

func TestLoadAndValidateMW5JakePack(t *testing.T) {
	packDir := mw5JakePackDir(t)

	pack, err := packimport.LoadPackDir(packDir)
	require.NoError(t, err)
	require.Equal(t, 1, pack.SchemaVersion)
	require.Equal(t, "mw5-jake", pack.Pack.Slug)
	require.Len(t, pack.Commands, 19)
	require.Len(t, pack.Greetings, 2)

	require.NoError(t, packimport.ValidatePack(pack))

	resolvedGreetings := pack.ResolvedGreetings()
	require.Len(t, resolvedGreetings, 2)
	require.Equal(t, "new_viewer", resolvedGreetings[0].ID)
	require.True(t, resolvedGreetings[0].Enabled)
	require.Equal(t, "Новый мехвоин прибыл: {viewer}. Добро пожаловать на борт!", resolvedGreetings[0].SplashTemplate)

	resolved := pack.ResolvedCommands()
	require.Len(t, resolved, 19)
	require.Equal(t, "hi", resolved[0].Trigger)
	require.Equal(t, "Новый наёмник в реестре. {viewer}, добро пожаловать в роту.", resolved[0].SplashTemplate)
	require.Equal(t, filepath.Join(packDir, "images", "jake-hi.png"), resolved[0].ImagePath)
	require.Equal(t, filepath.Join(packDir, "audio", "jake-hi.mp3"), resolved[0].AudioPath)
}

func TestValidatePackRejectsDuplicateTrigger(t *testing.T) {
	pack := &packimport.Pack{
		SchemaVersion: 1,
		Pack:          packimport.PackMeta{Slug: "test"},
		Commands: []packimport.CommandSpec{
			{Trigger: "gg", Splash: "A", Image: "images/a.png"},
			{Trigger: "gg", Splash: "B", Image: "images/b.png"},
		},
	}

	err := packimport.ValidatePack(pack)
	require.Error(t, err)
	require.Contains(t, err.Error(), "duplicate trigger")
}
