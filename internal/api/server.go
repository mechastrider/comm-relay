package api

import (
	"net/http"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/status"
	"github.com/mechastrider/comm-relay/internal/emote"
	"github.com/mechastrider/comm-relay/internal/runtime"
)

// Options configures the HTTP handler.
type Options struct {
	// WebRoot overrides embedded static assets with files from disk (for local UI dev).
	WebRoot    string
	Hub        *Hub
	Store      *config.Store
	History    *MessageHistory
	Registry   *status.Registry
	Runtime    *runtime.Info
	EmoteCache *emote.Cache
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

	configHandler := newConfigHandler(opts.Store)
	statusHandler := newStatusHandler(opts.Store, registry)
	diagnosticsHandler := newDiagnosticsHandler(opts.Store, registry, opts.Hub, rt, opts.EmoteCache)
	messagesHandler := newMessagesHandler(opts.History, opts.Hub)
	oauthState := newOAuthStateStore()
	youtubeOAuth := newYouTubeOAuthHandler(opts.Store, oauthState)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", handleHealth)
	mux.HandleFunc("GET /ws", opts.Hub.serveWS)
	mux.HandleFunc("GET /api/config", configHandler.handleGet)
	mux.HandleFunc("POST /api/config/update", configHandler.handleUpdate)
	mux.HandleFunc("GET /api/status", statusHandler.handleGet)
	mux.HandleFunc("GET /api/diagnostics", diagnosticsHandler.handleGet)
	mux.HandleFunc("GET /oauth/youtube/start", youtubeOAuth.handleStart)
	mux.HandleFunc("GET /oauth/youtube/callback", youtubeOAuth.handleCallback)
	mux.HandleFunc("GET /api/messages/recent", messagesHandler.handleRecent)
	mux.HandleFunc("POST /api/messages/delete", messagesHandler.handleDelete)
	mux.Handle("GET /dock/messages/", http.StripPrefix("/dock/messages/", http.FileServer(http.FS(static.dock))))
	mux.HandleFunc("GET /dock/messages", func(w http.ResponseWriter, r *http.Request) {
		serveFSFile(w, r, static.dock, "index.html")
	})
	mux.Handle("GET /overlay/", http.StripPrefix("/overlay/", http.FileServer(http.FS(static.overlay))))
	mux.HandleFunc("GET /overlay", func(w http.ResponseWriter, r *http.Request) {
		serveFSFile(w, r, static.overlay, "index.html")
	})
	mux.Handle("GET /shared/", http.StripPrefix("/shared/", http.FileServer(http.FS(static.shared))))
	mux.Handle("GET /", http.FileServer(http.FS(static.admin)))

	return mux, nil
}
