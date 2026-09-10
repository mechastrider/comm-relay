package packimport

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/mechastrider/comm-relay/internal/overlayassets"
)

// ResolveConfigDir returns the CommRelay config directory.
func ResolveConfigDir(flagValue string) string {
	if dir := strings.TrimSpace(flagValue); dir != "" {
		return dir
	}
	if dir := strings.TrimSpace(os.Getenv("COMM_RELAY_CONFIG_DIR")); dir != "" {
		return dir
	}
	if appData := strings.TrimSpace(os.Getenv("APPDATA")); appData != "" {
		return filepath.Join(appData, "comm-relay")
	}
	return ""
}

// ConfigPaths holds resolved CommRelay storage paths for import.
type ConfigPaths struct {
	ConfigDir  string
	ConfigPath string
	DBPath     string
	AssetsDir  string
}

// ResolveConfigPaths resolves config.json, database, and overlay asset paths.
func ResolveConfigPaths(configDir string) ConfigPaths {
	dir := ResolveConfigDir(configDir)
	configPath := filepath.Join(dir, "config.json")
	return ConfigPaths{
		ConfigDir:  dir,
		ConfigPath: configPath,
		DBPath:     filepath.Join(dir, "comm-relay.db"),
		AssetsDir:  overlayassets.DirForConfig(configPath),
	}
}
