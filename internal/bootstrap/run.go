package bootstrap

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/mechastrider/comm-relay/internal/api"
	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"
	"github.com/pior/runnable"
)

// Options configures process startup.
type Options struct {
	ConfigPath string
	Addr       string
	WebRoot    string
	Debug      bool
}

// Run starts the HTTP server and blocks until shutdown.
func Run(opts Options) error {
	setupLogging(opts.Debug)

	ctx := context.Background()

	cfg, err := config.Load(opts.ConfigPath)
	if err != nil {
		clog.Errorf(ctx, "load config: %w", err)
		return errors.Errorf("load config: %w", err)
	}

	addr := opts.Addr
	if addr == "" {
		addr = cfg.ListenAddr()
	}

	webRoot, err := resolveWebRoot(opts.WebRoot)
	if err != nil {
		return errors.Errorf("resolve web root: %w", err)
	}

	eventBus := bus.New(0)

	handler, err := api.NewHandler(api.Options{WebRoot: webRoot, Bus: eventBus})
	if err != nil {
		return errors.Errorf("create handler: %w", err)
	}

	srv := &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	clog.Info(ctx, "starting chat relay",
		slog.String("addr", addr),
		slog.String("config_path", opts.ConfigPath),
		slog.String("web_root", webRoot),
	)

	runnable.Run(
		runnable.HTTPServer(srv).
			ShutdownTimeout(10 * time.Second).
			Name("http"),
	)

	clog.Info(ctx, "chat relay stopped")
	return nil
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

func resolveWebRoot(override string) (string, error) {
	if override != "" {
		return override, nil
	}

	candidates := []string{"web"}
	if exec, err := os.Executable(); err == nil {
		candidates = append(candidates, filepath.Join(filepath.Dir(exec), "web"))
	}

	for _, root := range candidates {
		if fileExists(filepath.Join(root, "admin", "index.html")) {
			return root, nil
		}
	}

	return "", os.ErrNotExist
}

func fileExists(path string) bool {
	st, err := os.Stat(path)
	return err == nil && !st.IsDir()
}
