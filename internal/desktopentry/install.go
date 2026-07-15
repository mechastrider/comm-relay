// Package desktopentry installs an XDG .desktop entry and app icon for Linux.
// Linux desktop environments (Cinnamon on Linux Mint, GNOME, etc.) do not read
// icons embedded in binaries; a .desktop file is required for the panel/menu icon.
package desktopentry

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"

	"github.com/muonsoft/errors"
)

const (
	defaultAppID          = "comm-relay"
	defaultName           = "CommRelay"
	defaultComment        = "Local multi-platform chat overlay for OBS"
	defaultStartupWMClass = "CommRelay"
)

// Options controls where and how the desktop entry is installed.
type Options struct {
	// HomeDir is the user home directory (defaults to os.UserHomeDir).
	HomeDir string
	// ExecPath is the absolute path to the application binary.
	ExecPath string
	// IconPNG is the PNG icon bytes to install.
	IconPNG []byte
	// AppID is the icon/desktop basename without extension (default: comm-relay).
	AppID string
	// Name is the display name (default: CommRelay).
	Name string
	// Comment is the desktop entry comment.
	Comment string
	// StartupWMClass must match the GTK program name / WM_CLASS (default: CommRelay).
	StartupWMClass string
}

// Install writes the application icon and a .desktop file under the user's
// XDG data directories so Linux Mint / Cinnamon and similar DEs show the icon.
func Install(opts Options) error {
	if len(opts.IconPNG) == 0 {
		return errors.Errorf("desktopentry: icon png is empty")
	}
	execPath := strings.TrimSpace(opts.ExecPath)
	if execPath == "" {
		return errors.Errorf("desktopentry: exec path is empty")
	}
	if !filepath.IsAbs(execPath) {
		abs, err := filepath.Abs(execPath)
		if err != nil {
			return errors.Errorf("desktopentry: resolve exec path: %w", err)
		}
		execPath = abs
	}

	home := opts.HomeDir
	if home == "" {
		var err error
		home, err = os.UserHomeDir()
		if err != nil {
			return errors.Errorf("desktopentry: resolve home: %w", err)
		}
	}

	appID := opts.AppID
	if appID == "" {
		appID = defaultAppID
	}
	name := opts.Name
	if name == "" {
		name = defaultName
	}
	comment := opts.Comment
	if comment == "" {
		comment = defaultComment
	}
	wmClass := opts.StartupWMClass
	if wmClass == "" {
		wmClass = defaultStartupWMClass
	}

	iconDir := filepath.Join(home, ".local", "share", "icons", "hicolor", "256x256", "apps")
	if err := os.MkdirAll(iconDir, 0o755); err != nil {
		return errors.Errorf("desktopentry: create icon dir: %w", err)
	}
	iconPath := filepath.Join(iconDir, appID+".png")
	if err := writeIfChanged(iconPath, opts.IconPNG, 0o644); err != nil {
		return errors.Errorf("desktopentry: write icon: %w", err)
	}

	// Pixmaps is a widely supported fallback for desktop environments.
	pixmapsDir := filepath.Join(home, ".local", "share", "pixmaps")
	if err := os.MkdirAll(pixmapsDir, 0o755); err != nil {
		return errors.Errorf("desktopentry: create pixmaps dir: %w", err)
	}
	if err := writeIfChanged(filepath.Join(pixmapsDir, appID+".png"), opts.IconPNG, 0o644); err != nil {
		return errors.Errorf("desktopentry: write pixmaps icon: %w", err)
	}

	appsDir := filepath.Join(home, ".local", "share", "applications")
	if err := os.MkdirAll(appsDir, 0o755); err != nil {
		return errors.Errorf("desktopentry: create applications dir: %w", err)
	}

	desktopPath := filepath.Join(appsDir, appID+".desktop")
	desktop := buildDesktopFile(name, comment, execPath, iconPath, wmClass)
	if err := writeIfChanged(desktopPath, []byte(desktop), 0o644); err != nil {
		return errors.Errorf("desktopentry: write desktop file: %w", err)
	}

	return nil
}

func buildDesktopFile(name, comment, execPath, iconPath, wmClass string) string {
	var b strings.Builder
	b.WriteString("[Desktop Entry]\n")
	b.WriteString("Type=Application\n")
	b.WriteString("Version=1.0\n")
	b.WriteString("Name=" + name + "\n")
	b.WriteString("Comment=" + comment + "\n")
	b.WriteString("Exec=" + escapeDesktopExec(execPath) + "\n")
	b.WriteString("Icon=" + iconPath + "\n")
	b.WriteString("Terminal=false\n")
	b.WriteString("Categories=AudioVideo;Network;\n")
	b.WriteString("StartupNotify=true\n")
	b.WriteString("StartupWMClass=" + wmClass + "\n")
	return b.String()
}

// escapeDesktopExec quotes paths that contain spaces per Desktop Entry Spec.
func escapeDesktopExec(path string) string {
	if strings.ContainsAny(path, " \t\"'\\") {
		return `"` + strings.ReplaceAll(path, `"`, `\"`) + `"`
	}
	return path
}

func writeIfChanged(path string, content []byte, mode os.FileMode) error {
	existing, err := os.ReadFile(path)
	if err == nil && bytes.Equal(existing, content) {
		return nil
	}
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, content, mode); err != nil {
		return err
	}
	if err := os.Rename(tmp, path); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	return nil
}
