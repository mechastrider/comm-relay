package api

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/status"
	"github.com/mechastrider/comm-relay/internal/runtime"
	"github.com/muonsoft/errors"
)

// Options configures the HTTP handler.
type Options struct {
	WebRoot  string
	Hub      *Hub
	Store    *config.Store
	History  *MessageHistory
	Registry *status.Registry
	Runtime  *runtime.Info
}

// NewHandler returns the root HTTP handler for Chat Relay.
func NewHandler(opts Options) (http.Handler, error) {
	webRoot := opts.WebRoot
	if webRoot == "" {
		webRoot = "web"
	}

	adminDir := filepath.Join(webRoot, "admin")
	if _, err := os.Stat(filepath.Join(adminDir, "index.html")); err != nil {
		return nil, err
	}

	overlayDir := filepath.Join(webRoot, "overlay")
	if _, err := os.Stat(filepath.Join(overlayDir, "index.html")); err != nil {
		return nil, err
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
	diagnosticsHandler := newDiagnosticsHandler(opts.Store, registry, opts.Hub, rt)
	messagesHandler := newMessagesHandler(opts.History)
	oauthState := newOAuthStateStore()
	youtubeOAuth := newYouTubeOAuthHandler(opts.Store, oauthState)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", handleHealth)
	mux.HandleFunc("GET /ws", opts.Hub.serveWS)
	mux.HandleFunc("GET /api/config", configHandler.handleGet)
	mux.HandleFunc("PATCH /api/config", configHandler.handlePatch)
	mux.HandleFunc("GET /api/status", statusHandler.handleGet)
	mux.HandleFunc("GET /api/diagnostics", diagnosticsHandler.handleGet)
	mux.HandleFunc("GET /oauth/youtube/start", youtubeOAuth.handleStart)
	mux.HandleFunc("GET /oauth/youtube/callback", youtubeOAuth.handleCallback)
	mux.HandleFunc("GET /api/messages/recent", messagesHandler.handleRecent)
	mux.Handle("GET /overlay/", http.StripPrefix("/overlay/", http.FileServer(http.Dir(overlayDir))))
	mux.HandleFunc("GET /overlay", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(overlayDir, "index.html"))
	})
	mux.Handle("GET /", http.FileServer(http.Dir(adminDir)))

	return mux, nil
}
