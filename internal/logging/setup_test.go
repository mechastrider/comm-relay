package logging

import (
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/config"
)

func TestSetup_WhenEnabled_ExpectSessionFileAndStderrLogger(t *testing.T) {
	// Setup mutates slog.Default; do not run beside other Setup tests.
	prev := slog.Default()
	t.Cleanup(func() { slog.SetDefault(prev) })

	dir := t.TempDir()
	configPath := filepath.Join(dir, "config.json")
	require.NoError(t, os.WriteFile(configPath, []byte("{}"), 0o644))

	cfg := config.Default().Logging
	session, err := Setup(cfg, configPath, false)
	require.NoError(t, err)
	require.NotEmpty(t, session.FilePath())
	require.FileExists(t, session.FilePath())
	require.NoError(t, session.Close())

	logDir := filepath.Join(dir, "logs")
	entries, err := os.ReadDir(logDir)
	require.NoError(t, err)
	require.Len(t, entries, 1)
	require.True(t, strings.HasPrefix(entries[0].Name(), sessionPrefix))
}

func TestSetup_WhenDisabled_ExpectNoSessionFile(t *testing.T) {
	prev := slog.Default()
	t.Cleanup(func() { slog.SetDefault(prev) })

	dir := t.TempDir()
	configPath := filepath.Join(dir, "config.json")

	disabled := false
	cfg := config.LoggingConfig{
		Enabled:        &disabled,
		RetainSessions: 5,
	}

	session, err := Setup(cfg, configPath, false)
	require.NoError(t, err)
	require.Empty(t, session.FilePath())
	require.NoError(t, session.Close())

	_, err = os.Stat(filepath.Join(dir, "logs"))
	require.True(t, os.IsNotExist(err))
}

func TestPruneSessions_WhenMoreThanRetain_ExpectOldestRemoved(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	for _, name := range []string{
		"session-20260101-120000.000.log",
		"session-20260102-120000.000.log",
		"session-20260103-120000.000.log",
	} {
		require.NoError(t, os.WriteFile(filepath.Join(dir, name), []byte("x"), 0o644))
	}

	require.NoError(t, pruneSessions(dir, 2))

	entries, err := os.ReadDir(dir)
	require.NoError(t, err)
	require.Len(t, entries, 2)

	names := []string{entries[0].Name(), entries[1].Name()}
	require.ElementsMatch(t, []string{
		"session-20260102-120000.000.log",
		"session-20260103-120000.000.log",
	}, names)
}

func TestSetup_WritesToBothHandlers(t *testing.T) {
	prev := slog.Default()
	t.Cleanup(func() { slog.SetDefault(prev) })

	dir := t.TempDir()
	configPath := filepath.Join(dir, "config.json")

	session, err := Setup(config.Default().Logging, configPath, false)
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, session.Close()) })

	slog.Info("hello session log")

	data, err := os.ReadFile(session.FilePath())
	require.NoError(t, err)
	require.Contains(t, string(data), "hello session log")
}
