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

func logStartup(ctx context.Context, addr, configPath, webRoot string, cfg *config.Config) {
	connectors := enabledConnectors(cfg)

	webSource := "embedded"
	if webRoot != "" {
		webSource = webRoot
	}

	clog.Info(ctx, "starting chat relay",
		slog.String("addr", addr),
		slog.String("config_path", configPath),
		slog.String("web_source", webSource),
		slog.String("connectors", connectors),
	)
}

func enabledConnectors(cfg *config.Config) string {
	// Runnables are always registered; connectors watch the config store for changes.
	_ = cfg
	return strings.Join([]string{"twitch", "youtube", "vk"}, ", ")
}

func setupLogging(debug bool) {
	level := slog.LevelInfo
	if debug {
		level = slog.LevelDebug
	}

	handler := slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: level})
	logger := slog.New(handler)
	slog.SetDefault(logger)
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
