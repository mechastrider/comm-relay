//go:build wails

package main

import (
	"context"
	"embed"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"sync"
	"time"

	"github.com/muonsoft/clog"
	"github.com/pior/runnable"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/mechastrider/comm-relay/internal/bootstrap"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/logging"
)

//go:embed frontend
var frontendAssets embed.FS

type desktopApp struct {
	relay      *bootstrap.App
	adminURL   string
	debug      bool
	wailsCtx   context.Context
	logSession *logging.Session

	navMu     sync.Mutex
	viewReady bool
	navigated bool
}

func (a *desktopApp) tryNavigateAdmin() {
	a.navMu.Lock()
	defer a.navMu.Unlock()

	if a.navigated || a.adminURL == "" || !a.viewReady || a.wailsCtx == nil {
		return
	}

	a.navigated = true
	js := fmt.Sprintf(`window.location.replace(%q);`, a.adminURL)
	runtime.WindowExecJS(a.wailsCtx, js)
}

func (a *desktopApp) startup(ctx context.Context) {
	a.wailsCtx = ctx
	logging.SetupStderr(a.debug)

	configPath := a.configPath()
	cfg, err := config.Load(configPath)
	if err != nil {
		clog.Errorf(ctx, "load config: %w", err)
		runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
			Type:    runtime.ErrorDialog,
			Title:   "Chat Relay",
			Message: fmt.Sprintf("Failed to load config: %v", err),
		})
		runtime.Quit(ctx)
		return
	}

	logSession, logErr := logging.Setup(cfg.Logging, configPath, a.debug)
	if logErr != nil {
		clog.Warn(ctx, "session log file unavailable", slog.Any("error", logErr))
	}
	a.logSession = logSession
	logging.WriteStartupLine(logSession)
	runnable.SetLogger(slog.Default())

	app, err := bootstrap.New(bootstrap.Options{
		ConfigPath: configPath,
		WebRoot:    a.webRoot(),
		Debug:      a.debug,
	})
	if err != nil {
		clog.Errorf(ctx, "initialize relay: %w", err)
		runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
			Type:    runtime.ErrorDialog,
			Title:   "Chat Relay",
			Message: fmt.Sprintf("Failed to start: %v", err),
		})
		runtime.Quit(ctx)
		return
	}

	if err := app.Start(ctx); err != nil {
		clog.Errorf(ctx, "start relay: %w", err)
		runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
			Type:    runtime.ErrorDialog,
			Title:   "Chat Relay",
			Message: fmt.Sprintf("HTTP server did not start: %v", err),
		})
		runtime.Quit(ctx)
		return
	}

	a.relay = app
	a.adminURL = app.AdminURL()
	clog.Info(ctx, "chat relay desktop ready", slog.String("admin_url", a.adminURL))
	a.tryNavigateAdmin()
}

func (a *desktopApp) domReady(ctx context.Context) {
	a.wailsCtx = ctx

	a.navMu.Lock()
	a.viewReady = true
	a.navMu.Unlock()

	a.tryNavigateAdmin()
}

func (a *desktopApp) shutdown(ctx context.Context) {
	if a.logSession != nil {
		if err := a.logSession.Close(); err != nil {
			clog.Warn(ctx, "close session log", slog.Any("error", err))
		}
	}

	if a.relay == nil {
		return
	}

	stopCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := a.relay.Stop(stopCtx); err != nil {
		clog.Errorf(ctx, "stop relay: %w", err)
	}
}

func (a *desktopApp) configPath() string {
	if configPathFlag != "" {
		return configPathFlag
	}
	path, err := config.DefaultUserConfigPath()
	if err != nil {
		clog.Errorf(context.Background(), "resolve config path: %w", err)
		return "config.json"
	}
	return path
}

func (a *desktopApp) webRoot() string {
	return webRootFlag
}

var (
	configPathFlag string
	webRootFlag    string
	debugFlag      bool
)

func main() {
	flag.StringVar(&configPathFlag, "config", "", "path to config.json (default: OS user config dir)")
	flag.StringVar(&webRootFlag, "web", "", "path to web static assets on disk (default: embedded)")
	flag.BoolVar(&debugFlag, "debug", false, "enable debug logging")
	flag.Parse()

	app := &desktopApp{debug: debugFlag}

	err := wails.Run(&options.App{
		Title:             "Chat Relay",
		Width:             1100,
		Height:            760,
		MinWidth:          800,
		MinHeight:         600,
		StartHidden:       false,
		HideWindowOnClose: false,
		BackgroundColour:  &options.RGBA{R: 17, G: 17, B: 17, A: 255},
		AssetServer: &assetserver.Options{
			Assets: frontendAssets,
		},
		OnStartup:  app.startup,
		OnDomReady: app.domReady,
		OnShutdown: app.shutdown,
		SingleInstanceLock: &options.SingleInstanceLock{
			UniqueId: "mechastrider.comm-relay.desktop",
			OnSecondInstanceLaunch: func(options.SecondInstanceData) {
				if app.wailsCtx == nil {
					return
				}
				runtime.WindowUnminimise(app.wailsCtx)
				runtime.Show(app.wailsCtx)
			},
		},
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "chat-relay-desktop: %v\n", err)
		os.Exit(1)
	}
}
