package desktopentry_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/desktopentry"
)

func TestInstall_WhenValidOptions_ExpectDesktopAndIcon(t *testing.T) {
	t.Parallel()

	home := t.TempDir()
	execPath := filepath.Join(home, "opt", "CommRelay")
	require.NoError(t, os.MkdirAll(filepath.Dir(execPath), 0o755))
	require.NoError(t, os.WriteFile(execPath, []byte("#!/bin/true"), 0o755))

	icon := []byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a} // PNG signature stub

	err := desktopentry.Install(desktopentry.Options{
		HomeDir:  home,
		ExecPath: execPath,
		IconPNG:  icon,
	})
	require.NoError(t, err)

	iconPath := filepath.Join(home, ".local", "share", "icons", "hicolor", "256x256", "apps", "comm-relay.png")
	gotIcon, err := os.ReadFile(iconPath)
	require.NoError(t, err)
	require.Equal(t, icon, gotIcon)

	pixmapsPath := filepath.Join(home, ".local", "share", "pixmaps", "comm-relay.png")
	gotPixmaps, err := os.ReadFile(pixmapsPath)
	require.NoError(t, err)
	require.Equal(t, icon, gotPixmaps)

	desktopPath := filepath.Join(home, ".local", "share", "applications", "comm-relay.desktop")
	gotDesktop, err := os.ReadFile(desktopPath)
	require.NoError(t, err)

	content := string(gotDesktop)
	require.Contains(t, content, "Name=CommRelay\n")
	require.Contains(t, content, "Exec="+expectedDesktopExec(execPath)+"\n")
	require.Contains(t, content, "Icon="+iconPath+"\n")
	require.Contains(t, content, "StartupWMClass=CommRelay\n")
	require.Contains(t, content, "Type=Application\n")
}

func expectedDesktopExec(path string) string {
	if strings.ContainsAny(path, " \t\"'\\") {
		return `"` + strings.ReplaceAll(path, `"`, `\"`) + `"`
	}
	return path
}

func TestInstall_WhenPathHasSpaces_ExpectQuotedExec(t *testing.T) {
	t.Parallel()

	home := t.TempDir()
	execPath := filepath.Join(home, "My Apps", "CommRelay")
	require.NoError(t, os.MkdirAll(filepath.Dir(execPath), 0o755))
	require.NoError(t, os.WriteFile(execPath, []byte("#!/bin/true"), 0o755))

	err := desktopentry.Install(desktopentry.Options{
		HomeDir:  home,
		ExecPath: execPath,
		IconPNG:  []byte("png"),
	})
	require.NoError(t, err)

	desktopPath := filepath.Join(home, ".local", "share", "applications", "comm-relay.desktop")
	gotDesktop, err := os.ReadFile(desktopPath)
	require.NoError(t, err)
	require.Contains(t, string(gotDesktop), `Exec="`+execPath+`"`)
}

func TestInstall_WhenCalledTwice_ExpectIdempotent(t *testing.T) {
	t.Parallel()

	home := t.TempDir()
	execPath := filepath.Join(home, "CommRelay")
	require.NoError(t, os.WriteFile(execPath, []byte("x"), 0o755))
	icon := []byte("icon-bytes")

	opts := desktopentry.Options{HomeDir: home, ExecPath: execPath, IconPNG: icon}
	require.NoError(t, desktopentry.Install(opts))
	require.NoError(t, desktopentry.Install(opts))

	desktopPath := filepath.Join(home, ".local", "share", "applications", "comm-relay.desktop")
	info, err := os.Stat(desktopPath)
	require.NoError(t, err)
	require.Greater(t, info.Size(), int64(0))
}

func TestInstall_WhenIconEmpty_ExpectError(t *testing.T) {
	t.Parallel()

	err := desktopentry.Install(desktopentry.Options{
		HomeDir:  t.TempDir(),
		ExecPath: "/tmp/CommRelay",
	})
	require.Error(t, err)
}

func TestInstall_WhenExecEmpty_ExpectError(t *testing.T) {
	t.Parallel()

	err := desktopentry.Install(desktopentry.Options{
		HomeDir: t.TempDir(),
		IconPNG: []byte("png"),
	})
	require.Error(t, err)
}
