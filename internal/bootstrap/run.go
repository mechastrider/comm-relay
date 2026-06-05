package bootstrap

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/mechastrider/comm-relay/internal/api"
	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/status"
	twitchconnector "github.com/mechastrider/comm-relay/internal/connector/twitch"
	vkconnector "github.com/mechastrider/comm-relay/internal/connector/vk"
	youtubeconnector "github.com/mechastrider/comm-relay/internal/connector/youtube"
	"github.com/mechastrider/comm-relay/internal/runtime"
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

	webRoot := opts.WebRoot
	if webRoot != "" {
		if err := validateWebRoot(webRoot); err != nil {
			return errors.Errorf("resolve web root: %w", err)
		}
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
	statusRegistry := status.NewRegistry()
	runtimeInfo := runtime.NewInfo()

	handler, err := api.NewHandler(api.Options{
		WebRoot:  webRoot,
		Hub:      hub,
		Store:    store,
		History:  history,
		Registry: statusRegistry,
		Runtime:  runtimeInfo,
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
		runnable.Func(func(ctx context.Context) error {
			statusRegistry.RunMessageCounter(ctx, eventBus)
			return nil
		}).Name("message-counter"),
	)

	processes := []runnable.Runnable{
		runnable.HTTPServer(srv).
			ShutdownTimeout(10 * time.Second).
			Name("http"),
	}

	twitchConn := twitchconnector.New(eventBus, store, statusRegistry)
	processes = append(processes, runnable.Func(func(ctx context.Context) error {
		if err := twitchConn.Run(ctx); err != nil {
			clog.Errorf(ctx, "twitch connector stopped with error: %w", err)
		}
		return nil
	}).Name("twitch"))

	youtubeConn := youtubeconnector.New(eventBus, store, statusRegistry)
	processes = append(processes, runnable.Func(func(ctx context.Context) error {
		if err := youtubeConn.Run(ctx); err != nil {
			clog.Errorf(ctx, "youtube connector stopped with error: %w", err)
		}
		return nil
	}).Name("youtube"))

	vkConn := vkconnector.New(eventBus, store, statusRegistry)
	processes = append(processes, runnable.Func(func(ctx context.Context) error {
		if err := vkConn.Run(ctx); err != nil {
			clog.Errorf(ctx, "vk connector stopped with error: %w", err)
		}
		return nil
	}).Name("vk"))

	mgr.Register(processes...)
	runnable.Run(mgr)

	eventBus.Close()

	clog.Info(ctx, "chat relay stopped")
	return nil
}

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
