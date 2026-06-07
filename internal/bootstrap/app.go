package bootstrap

import (
	"context"
	"net/http"
	"time"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"
	"github.com/pior/runnable"

	"github.com/mechastrider/comm-relay/internal/api"
	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/status"
	twitchconnector "github.com/mechastrider/comm-relay/internal/connector/twitch"
	vkconnector "github.com/mechastrider/comm-relay/internal/connector/vk"
	youtubeconnector "github.com/mechastrider/comm-relay/internal/connector/youtube"
	"github.com/mechastrider/comm-relay/internal/emote"
	"github.com/mechastrider/comm-relay/internal/emote/bttv"
	"github.com/mechastrider/comm-relay/internal/emote/ffz"
	"github.com/mechastrider/comm-relay/internal/emote/seventv"
	"github.com/mechastrider/comm-relay/internal/emote/ytemoji"
	"github.com/mechastrider/comm-relay/internal/runtime"
)

// App runs Chat Relay HTTP services and connectors until stopped.
type App struct {
	eventBus  *bus.Bus
	runner    runnable.Runnable
	cancel    context.CancelFunc
	done      chan struct{}
	adminURL  string
	healthURL string
}

// New wires config, event bus, WebSocket hub, HTTP API, and connectors without starting them.
func New(opts Options) (*App, error) {
	cfg, err := config.Load(opts.ConfigPath)
	if err != nil {
		return nil, errors.Errorf("load config: %w", err)
	}

	addr := opts.Addr
	if addr == "" {
		addr = cfg.ListenAddr()
	}

	webRoot := opts.WebRoot
	if webRoot != "" {
		if validateErr := validateWebRoot(webRoot); validateErr != nil {
			return nil, errors.Errorf("resolve web root: %w", validateErr)
		}
	}

	eventBus := bus.New(0)
	hub, err := api.NewHub(eventBus)
	if err != nil {
		return nil, errors.Errorf("create websocket hub: %w", err)
	}

	store, err := config.NewStore(opts.ConfigPath, cfg)
	if err != nil {
		return nil, errors.Errorf("create config store: %w", err)
	}

	history := api.NewMessageHistory(0)
	statusRegistry := status.NewRegistry()
	runtimeInfo := runtime.NewInfo()
	emoteHTTP := emote.NewHTTPClient()
	emoteCache := emote.New(emote.Options{})
	ffzFetcher := ffz.New(emoteHTTP)
	emoteCache.RegisterFetcher(ffzFetcher)
	emoteCache.RegisterFetcher(bttv.New(emoteHTTP, ffzFetcher))
	emoteCache.RegisterFetcher(seventv.New(emoteHTTP, ffzFetcher))
	emoteEnricher := emote.NewEnricher(emoteCache)
	emoteRefresher := emote.NewRefresher(emoteCache, store)
	youtubeEmojiCatalog := ytemoji.NewCatalog()
	youtubeEmojiRefresher := ytemoji.NewRefresher(youtubeEmojiCatalog, emoteHTTP)

	handler, err := api.NewHandler(api.Options{
		WebRoot:    webRoot,
		Hub:        hub,
		Store:      store,
		History:    history,
		Registry:   statusRegistry,
		Runtime:    runtimeInfo,
		EmoteCache: emoteCache,
	})
	if err != nil {
		return nil, errors.Errorf("create handler: %w", err)
	}

	srv := &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

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
		runnable.Func(func(ctx context.Context) error {
			emoteCache.RunMaintenance(ctx)
			return nil
		}).Name("emote-cache-maintenance"),
		runnable.Func(func(ctx context.Context) error {
			emoteRefresher.Run(ctx)
			return nil
		}).Name("emote-cache-refresh"),
		runnable.Func(func(ctx context.Context) error {
			youtubeEmojiRefresher.Run(ctx)
			return nil
		}).Name("youtube-emoji-refresh"),
	)

	processes := []runnable.Runnable{
		runnable.HTTPServer(srv).
			ShutdownTimeout(10 * time.Second).
			Name("http"),
	}

	twitchConn := twitchconnector.New(eventBus, store, statusRegistry, emoteEnricher)
	processes = append(processes, runnable.Func(func(ctx context.Context) error {
		if err := twitchConn.Run(ctx); err != nil {
			clog.Errorf(ctx, "twitch connector stopped with error: %w", err)
		}
		return nil
	}).Name("twitch"))

	youtubeConn := youtubeconnector.New(eventBus, store, statusRegistry, youtubeEmojiCatalog, emoteHTTP)
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

	return &App{
		eventBus:  eventBus,
		runner:    mgr,
		adminURL:  config.AdminBaseURLForListenAddr(addr, cfg),
		healthURL: config.HealthURLForListenAddr(addr, cfg),
	}, nil
}

// AdminURL is the loopback URL of the admin panel (trailing slash).
func (a *App) AdminURL() string {
	return a.adminURL
}

// Start runs background workers and waits until the HTTP health endpoint responds.
func (a *App) Start(ctx context.Context) error {
	if a.cancel != nil {
		return errors.New("app already started")
	}

	runCtx, cancel := context.WithCancel(ctx)
	a.cancel = cancel
	a.done = make(chan struct{})

	go func() {
		defer close(a.done)
		if err := a.runner.Run(runCtx); err != nil && runCtx.Err() == nil {
			clog.Errorf(runCtx, "manager stopped: %w", err)
		}
		a.eventBus.Close()
	}()

	return waitHTTPReady(runCtx, a.healthURL, 30*time.Second)
}

// Stop cancels background workers and waits for shutdown.
func (a *App) Stop(ctx context.Context) error {
	if a.cancel == nil {
		return nil
	}

	a.cancel()

	select {
	case <-a.done:
		a.cancel = nil
		return nil
	case <-ctx.Done():
		return errors.Errorf("stop app: %w", ctx.Err())
	}
}

// LogStartup logs listen address and connector list after Start succeeds.
func (a *App) LogStartup(ctx context.Context, addr, configPath, webRoot, logFile string, cfg *config.Config) {
	logStartup(ctx, addr, configPath, webRoot, logFile, cfg)
}
