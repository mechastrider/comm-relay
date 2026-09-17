package packimport_test

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/packimport"
	"github.com/mechastrider/comm-relay/internal/store"
)

func writeMinimalPackWithAliases(t *testing.T, dir string, aliases []string) error {
	t.Helper()
	require.NoError(t, os.MkdirAll(filepath.Join(dir, "images"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "images", "img.png"), tinyPNGBytes(), 0o644))

	var aliasLines string
	if len(aliases) > 0 {
		aliasLines = "    aliases:\n"
		for _, alias := range aliases {
			aliasLines += fmt.Sprintf("      - %q\n", alias)
		}
	}

	packYAML := fmt.Sprintf(`schema_version: 1
pack:
  slug: test-pack
  title: Test
  locale: en-GB
defaults:
  enabled: true
  action: alert
commands:
  - trigger: packcmd
    splash: "Pack command"
    sound: chime
    duration_ms: 5000
    cooldown_seconds: 0
    image: images/img.png
%s`, aliasLines)
	return os.WriteFile(filepath.Join(dir, "pack.yaml"), []byte(packYAML), 0o644)
}

func TestValidatePack_WhenDuplicateAliasAcrossCommands_ExpectError(t *testing.T) {
	pack := &packimport.Pack{
		SchemaVersion: 1,
		Pack:          packimport.PackMeta{Slug: "test"},
		Commands: []packimport.CommandSpec{
			{Trigger: "one", Splash: "A", Image: "images/a.png", Aliases: []string{"shared"}},
			{Trigger: "two", Splash: "B", Image: "images/b.png", Aliases: []string{"shared"}},
		},
	}

	err := packimport.ValidatePack(pack)
	require.Error(t, err)
	require.Contains(t, err.Error(), "duplicate alias")
}

func TestApply_WhenAliasesValid_ExpectStored(t *testing.T) {
	dir := t.TempDir()
	packDir := filepath.Join(dir, "pack")
	require.NoError(t, writeMinimalPackWithAliases(t, packDir, []string{"nick"}))

	pack, err := packimport.LoadPackDir(packDir)
	require.NoError(t, err)

	dbPath := filepath.Join(dir, "comm-relay.db")
	s, err := store.Open(dbPath, store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })

	assetsDir := filepath.Join(dir, "assets")
	result, err := packimport.Apply(pack, s, assetsDir, packimport.ApplyOptions{})
	require.NoError(t, err)
	require.GreaterOrEqual(t, result.Applied, 1)

	commands, err := s.ListCommands()
	require.NoError(t, err)
	var found bool
	for _, cmd := range commands {
		if cmd.Trigger == "packcmd" {
			found = true
			require.Equal(t, []string{"nick"}, cmd.Aliases)
		}
	}
	require.True(t, found)
}

func TestApply_WhenAliasCollidesWithExistingTrigger_ExpectError(t *testing.T) {
	dir := t.TempDir()
	packDir := filepath.Join(dir, "pack")
	require.NoError(t, writeMinimalPackWithAliases(t, packDir, []string{"gg"}))

	pack, err := packimport.LoadPackDir(packDir)
	require.NoError(t, err)

	dbPath := filepath.Join(dir, "comm-relay.db")
	s, err := store.Open(dbPath, store.OpenOptions{TimeLocale: "en-GB"})
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, s.Close()) })

	assetsDir := filepath.Join(dir, "assets")
	_, err = packimport.Apply(pack, s, assetsDir, packimport.ApplyOptions{})
	require.Error(t, err)
}
