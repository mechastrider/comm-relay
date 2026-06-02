package bootstrap

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/mechastrider/comm-relay/internal/api"
	"github.com/muonsoft/clog"
	"github.com/pior/runnable"
)

const defaultAddr = ":17877"

// Options configures process startup.
type Options struct {
	Addr    string
	WebRoot string
	Debug   bool
}

// Run starts the HTTP server and blocks until shutdown.
func Run(opts Options) error {
	if opts.Addr == "" {
		opts.Addr = defaultAddr
	}

	setupLogging(opts.Debug)

	webRoot, err := resolveWebRoot(opts.WebRoot)
	if err != nil {
		return err
	}

	handler, err := api.NewHandler(api.Options{WebRoot: webRoot})
	if err != nil {
		return err
	}

	srv := &http.Server{
		Addr:              opts.Addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	ctx := context.Background()
	clog.Info(ctx, "starting chat relay", slog.String("addr", opts.Addr), slog.String("web_root", webRoot))

	runnable.Run(
		runnable.HTTPServer(srv).
			ShutdownTimeout(10 * time.Second).
			Name("http"),
	)

	clog.Info(ctx, "chat relay stopped")
	return nil
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
