package bootstrap

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"
	"github.com/pior/runnable"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/logging"
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
	logging.SetupStderr(opts.Debug)

	cfg, err := config.Load(opts.ConfigPath)
	if err != nil {
		return errors.Errorf("load config: %w", err)
	}

	logSession, err := logging.Setup(cfg.Logging, opts.ConfigPath, opts.Debug)
	if err != nil {
		clog.Warn(context.Background(), "session log file unavailable", slog.Any("error", err))
	}
	defer func() {
		if closeErr := logSession.Close(); closeErr != nil {
			clog.Warn(context.Background(), "close session log", slog.Any("error", closeErr))
		}
	}()
	logging.WriteStartupLine(logSession)
	runnable.SetLogger(slog.Default())

	app, err := New(opts)
	if err != nil {
		clog.Errorf(context.Background(), "initialize app: %w", err)
		return err
	}

	addr := opts.Addr
	if addr == "" {
		addr = cfg.ListenAddr()
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := app.Start(ctx); err != nil {
		return errors.Errorf("start app: %w", err)
	}

	app.LogStartup(ctx, addr, opts.ConfigPath, opts.WebRoot, logSession.FilePath(), cfg)

	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := app.Stop(shutdownCtx); err != nil {
		return errors.Errorf("stop app: %w", err)
	}

	clog.Info(context.Background(), "chat relay stopped")
	return nil
}
