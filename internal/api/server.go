package api

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/muonsoft/errors"
)

// Options configures the HTTP handler.
type Options struct {
	WebRoot string
	Hub     *Hub
	Store   *config.Store
	History *MessageHistory
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

	configHandler := newConfigHandler(opts.Store)
	statusHandler := newStatusHandler(opts.Store)
	messagesHandler := newMessagesHandler(opts.History)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", handleHealth)
	mux.HandleFunc("GET /ws", opts.Hub.serveWS)
	mux.HandleFunc("GET /api/config", configHandler.handleGet)
	mux.HandleFunc("PATCH /api/config", configHandler.handlePatch)
	mux.HandleFunc("GET /api/status", statusHandler.handleGet)
	mux.HandleFunc("GET /api/messages/recent", messagesHandler.handleRecent)
	mux.Handle("GET /overlay/", http.StripPrefix("/overlay/", http.FileServer(http.Dir(overlayDir))))
	mux.HandleFunc("GET /overlay", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(overlayDir, "index.html"))
	})
	mux.Handle("GET /", http.FileServer(http.Dir(adminDir)))

	return mux, nil
}
