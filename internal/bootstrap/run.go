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
	twitchconnector "github.com/mechastrider/comm-relay/internal/connector/twitch"
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

// Run wires config, event bus, WebSocket hub, HTTP API, and connectors, then blocks until shutdown.
func Run(opts Options) error {
	setupLogging(opts.Debug)
	runnable.SetLogger(slog.Default())

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
	hub, err := api.NewHub(eventBus)
	if err != nil {
		return errors.Errorf("create websocket hub: %w", err)
	}

	store, err := config.NewStore(opts.ConfigPath, cfg)
	if err != nil {
		return errors.Errorf("create config store: %w", err)
	}

	history := api.NewMessageHistory(0)

	handler, err := api.NewHandler(api.Options{
		WebRoot: webRoot,
		Hub:     hub,
		Store:   store,
		History: history,
	})
	if err != nil {
		return errors.Errorf("create handler: %w", err)
	}

	srv := &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	logStartup(ctx, addr, opts.ConfigPath, webRoot, cfg)

	mgr := runnable.Manager().ShutdownTimeout(10 * time.Second)
	mgr.RegisterService(
		runnable.Func(func(ctx context.Context) error {
			hub.Run(ctx)
			return nil
		}).Name("websocket-hub"),
		runnable.Func(func(ctx context.Context) error {
			history.Run(ctx, eventBus)
			return nil
		}).Name("message-history"),
	)

	processes := []runnable.Runnable{
		runnable.HTTPServer(srv).
			ShutdownTimeout(10 * time.Second).
			Name("http"),
	}

	twitchConn := twitchconnector.New(eventBus, store)
	processes = append(processes, runnable.Func(func(ctx context.Context) error {
		if err := twitchConn.Run(ctx); err != nil {
			clog.Errorf(ctx, "twitch connector stopped with error: %w", err)
		}
		return nil
	}).Name("twitch"))

	mgr.Register(processes...)
	runnable.Run(mgr)

	eventBus.Close()

	clog.Info(ctx, "chat relay stopped")
	return nil
}

func logStartup(ctx context.Context, addr, configPath, webRoot string, cfg *config.Config) {
	connectors := enabledConnectors(cfg)

	clog.Info(ctx, "starting chat relay",
		slog.String("addr", addr),
		slog.String("config_path", configPath),
		slog.String("web_root", webRoot),
		slog.String("connectors", connectors),
	)
}

func enabledConnectors(cfg *config.Config) string {
	// Twitch runnable is always registered; it watches the config store for enable/channel changes.
	_ = cfg
	return "twitch"
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
