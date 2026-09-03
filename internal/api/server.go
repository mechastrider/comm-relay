package api

import (
	"net/http"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/status"
	"github.com/mechastrider/comm-relay/internal/emote"
	"github.com/mechastrider/comm-relay/internal/runtime"
	"github.com/mechastrider/comm-relay/internal/store"
)

// Options configures the HTTP handler.
type Options struct {
	// WebRoot overrides embedded static assets with files from disk (for local UI dev).
	WebRoot              string
	Hub                  *Hub
	Store                *config.Store
	ViewerStore          *store.Store
	LeaderboardPublisher *LeaderboardPublisher
	History              *MessageHistory
	Registry             *status.Registry
	Runtime              *runtime.Info
	EmoteCache           *emote.Cache
}

// NewHandler returns the root HTTP handler for CommRelay.
func NewHandler(opts Options) (http.Handler, error) {
	static, err := resolveStaticRoots(opts.WebRoot)
	if err != nil {
		return nil, errors.Errorf("resolve static assets: %w", err)
	}

	if opts.Hub == nil {
		return nil, errors.New("websocket hub is required")
	}
	if opts.Store == nil {
		return nil, errors.New("config store is required")
	}
	if opts.History == nil {
		return nil, errors.New("message history is required")
	}

	registry := opts.Registry
	if registry == nil {
		registry = status.NewRegistry()
	}

	rt := opts.Runtime
	if rt == nil {
		rt = runtime.NewInfo()
	}

	configHandler := newConfigHandler(opts.Store, opts.Hub)
	overlayAssets := newOverlayAssetsHandler(opts.Store.Path())
	statusHandler := newStatusHandler(opts.Store, registry)
	diagnosticsHandler := newDiagnosticsHandler(opts.Store, registry, opts.Hub, rt, opts.EmoteCache)
	messagesHandler := newMessagesHandler(opts.History, opts.Hub)
	oauthState := newOAuthStateStore()
	youtubeOAuth := newYouTubeOAuthHandler(opts.Store, oauthState)
	supportOpen := newSupportOpenHandler()
	leaderboardPublisher := opts.LeaderboardPublisher
	if leaderboardPublisher == nil && opts.ViewerStore != nil {
		leaderboardPublisher = newLeaderboardPublisher(opts.Hub, opts.ViewerStore, opts.Store)
	}
	viewersHandler := newViewersHandler(opts.ViewerStore, opts.Store, leaderboardPublisher)
	commandsHandler := newCommandsHandler(opts.ViewerStore)
	awardsHandler := newAwardsHandler(opts.ViewerStore, opts.Hub, leaderboardPublisher, opts.Store)
	overlayDebug := newOverlayDebugHandler(opts.Hub)

	mux := http.NewServeMux()
	instanceID := ""
	if rt != nil {
		instanceID = rt.InstanceID
	}
	mux.HandleFunc("GET /health", handleHealth(instanceID))
	mux.HandleFunc("GET /ws", opts.Hub.serveWS)
	mux.HandleFunc("GET /ws/overlay-debug", opts.Hub.serveDebugWS)
	mux.HandleFunc("POST /api/overlay-debug/scenario/fire", overlayDebug.handleFire)
	mux.HandleFunc("POST /api/overlay-debug/session/reset", overlayDebug.handleReset)
	mux.HandleFunc("GET /api/config", configHandler.handleGet)
	mux.HandleFunc("POST /api/config/update", configHandler.handleUpdate)
	mux.HandleFunc("POST /api/overlay/activate", configHandler.handleOverlayActivate)
	mux.HandleFunc("POST /api/overlay/assets/upload", overlayAssets.handleUpload)
	mux.HandleFunc("GET /api/status", statusHandler.handleGet)
	mux.HandleFunc("GET /api/diagnostics", diagnosticsHandler.handleGet)
	mux.HandleFunc("POST /api/youtube/oauth/start", youtubeOAuth.handleStartAPI)
	mux.HandleFunc("POST /api/support/open", supportOpen.handleOpen)
	mux.HandleFunc("GET /oauth/youtube/start", youtubeOAuth.handleStart)
	mux.HandleFunc("GET /oauth/youtube/callback", youtubeOAuth.handleCallback)
	mux.HandleFunc("GET /api/messages/recent", messagesHandler.handleRecent)
	mux.HandleFunc("POST /api/messages/delete", messagesHandler.handleDelete)
	mux.HandleFunc("GET /api/viewers", viewersHandler.handleList)
	mux.HandleFunc("GET /api/viewers/get", viewersHandler.handleGet)
	mux.HandleFunc("POST /api/viewers/merge", viewersHandler.handleMerge)
	mux.HandleFunc("POST /api/viewers/update", viewersHandler.handleUpdate)
	mux.HandleFunc("POST /api/sessions/start", viewersHandler.handleStartSession)
	mux.HandleFunc("GET /api/leaderboard", viewersHandler.handleLeaderboard)
	mux.HandleFunc("GET /api/commands", commandsHandler.handleList)
	mux.HandleFunc("POST /api/commands/create", commandsHandler.handleCreate)
	mux.HandleFunc("POST /api/commands/update", commandsHandler.handleUpdate)
	mux.HandleFunc("POST /api/commands/delete", commandsHandler.handleDelete)
	mux.HandleFunc("GET /api/awards", awardsHandler.handleList)
	mux.HandleFunc("POST /api/awards/create", awardsHandler.handleCreate)
	mux.HandleFunc("POST /api/awards/update", awardsHandler.handleUpdate)
	mux.HandleFunc("POST /api/awards/delete", awardsHandler.handleDelete)
	mux.HandleFunc("POST /api/awards/grant", awardsHandler.handleGrant)
	mux.Handle("GET /dock/messages/", http.StripPrefix("/dock/messages/", http.FileServer(http.FS(static.dock))))
	mux.HandleFunc("GET /dock/messages", func(w http.ResponseWriter, r *http.Request) {
		serveFSFile(w, r, static.dock, "index.html")
	})
	mux.HandleFunc("GET /overlay/assets/{filename}", overlayAssets.handleGet)
	// Test pages deliberately reuse each production surface's assets while the
	// browser-side path check selects the isolated debug WebSocket audience.
	// Keep these routes before the production directory handlers so old builds
	// fail closed with 404 instead of ever falling through to a live overlay.
	mux.HandleFunc("GET /overlay/test/chat", func(w http.ResponseWriter, r *http.Request) {
		serveFSFile(w, r, static.overlay, "index.html")
	})
	mux.HandleFunc("GET /overlay/test/leaderboard", func(w http.ResponseWriter, r *http.Request) {
		serveFSFile(w, r, static.leaderboard, "index.html")
	})
	mux.HandleFunc("GET /overlay/test/alert", func(w http.ResponseWriter, r *http.Request) {
		serveFSFile(w, r, static.alert, "index.html")
	})
	mux.Handle("GET /overlay/leaderboard/", http.StripPrefix("/overlay/leaderboard/", http.FileServer(http.FS(static.leaderboard))))
	mux.HandleFunc("GET /overlay/leaderboard", func(w http.ResponseWriter, r *http.Request) {
		serveFSFile(w, r, static.leaderboard, "index.html")
	})
	mux.Handle("GET /overlay/alert/", http.StripPrefix("/overlay/alert/", http.FileServer(http.FS(static.alert))))
	mux.HandleFunc("GET /overlay/alert", func(w http.ResponseWriter, r *http.Request) {
		serveFSFile(w, r, static.alert, "index.html")
	})
	mux.Handle("GET /overlay/", http.StripPrefix("/overlay/", http.FileServer(http.FS(static.overlay))))
	mux.HandleFunc("GET /overlay", func(w http.ResponseWriter, r *http.Request) {
		serveFSFile(w, r, static.overlay, "index.html")
	})
	mux.Handle("GET /shared/", http.StripPrefix("/shared/", http.FileServer(http.FS(static.shared))))
	mux.Handle("GET /", http.FileServer(http.FS(static.admin)))

	return mux, nil
}
