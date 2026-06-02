package api

import (
	"net/http"
	"os"
	"path/filepath"
)

// Options configures the HTTP handler.
type Options struct {
	WebRoot string
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

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", handleHealth)
	mux.Handle("GET /overlay/", http.StripPrefix("/overlay/", http.FileServer(http.Dir(overlayDir))))
	mux.HandleFunc("GET /overlay", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(overlayDir, "index.html"))
	})
	mux.Handle("GET /", http.FileServer(http.Dir(adminDir)))

	return mux, nil
}
