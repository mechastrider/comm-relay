package bootstrap

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	"github.com/muonsoft/clog"

	"github.com/mechastrider/comm-relay/internal/config"
)

func logStartup(ctx context.Context, addr, configPath, webRoot, logFile string, cfg *config.Config) {
	connectors := enabledConnectors(cfg)

	webSource := "embedded"
	if webRoot != "" {
		webSource = webRoot
	}

	args := []any{
		slog.String("addr", addr),
		slog.String("config_path", configPath),
		slog.String("web_source", webSource),
		slog.String("connectors", connectors),
	}
	if logFile != "" {
		args = append(args, slog.String("log_file", logFile))
	}

	clog.Info(ctx, "starting chat relay", args...)
}

func enabledConnectors(cfg *config.Config) string {
	// Runnables are always registered; connectors watch the config store for changes.
	_ = cfg
	return strings.Join([]string{"twitch", "youtube", "vk"}, ", ")
}

func validateWebRoot(root string) error {
	if !fileExists(filepath.Join(root, "admin", "index.html")) {
		return os.ErrNotExist
	}
	if !fileExists(filepath.Join(root, "overlay", "index.html")) {
		return os.ErrNotExist
	}

	return nil
}

func fileExists(path string) bool {
	st, err := os.Stat(path)
	return err == nil && !st.IsDir()
}
