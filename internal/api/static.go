package api

import (
	"io"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"

	"github.com/muonsoft/errors"

	webstatic "github.com/mechastrider/comm-relay/web"
)

type staticRoots struct {
	admin       fs.FS
	dock        fs.FS
	overlay     fs.FS
	leaderboard fs.FS
	shared      fs.FS
}

func resolveStaticRoots(webRoot string) (staticRoots, error) {
	if webRoot != "" {
		return staticRootsFromDisk(webRoot)
	}

	admin, err := fs.Sub(webstatic.FS, "admin")
	if err != nil {
		return staticRoots{}, errors.Errorf("embedded admin assets: %w", err)
	}
	dock, err := fs.Sub(webstatic.FS, "dock")
	if err != nil {
		return staticRoots{}, errors.Errorf("embedded dock assets: %w", err)
	}
	overlay, err := fs.Sub(webstatic.FS, "overlay")
	if err != nil {
		return staticRoots{}, errors.Errorf("embedded overlay assets: %w", err)
	}
	leaderboard, err := fs.Sub(webstatic.FS, "leaderboard")
	if err != nil {
		return staticRoots{}, errors.Errorf("embedded leaderboard assets: %w", err)
	}
	shared, err := fs.Sub(webstatic.FS, "shared")
	if err != nil {
		return staticRoots{}, errors.Errorf("embedded shared assets: %w", err)
	}

	return staticRoots{admin: admin, dock: dock, overlay: overlay, leaderboard: leaderboard, shared: shared}, nil
}

func staticRootsFromDisk(webRoot string) (staticRoots, error) {
	adminDir := filepath.Join(webRoot, "admin")
	if _, err := os.Stat(filepath.Join(adminDir, "index.html")); err != nil {
		return staticRoots{}, err
	}

	dockDir := filepath.Join(webRoot, "dock")
	if _, err := os.Stat(filepath.Join(dockDir, "index.html")); err != nil {
		return staticRoots{}, err
	}

	overlayDir := filepath.Join(webRoot, "overlay")
	if _, err := os.Stat(filepath.Join(overlayDir, "index.html")); err != nil {
		return staticRoots{}, err
	}

	leaderboardDir := filepath.Join(webRoot, "leaderboard")
	if _, err := os.Stat(filepath.Join(leaderboardDir, "index.html")); err != nil {
		return staticRoots{}, err
	}

	sharedDir := filepath.Join(webRoot, "shared")
	if _, err := os.Stat(filepath.Join(sharedDir, "chat-render.js")); err != nil {
		return staticRoots{}, err
	}

	return staticRoots{
		admin:       os.DirFS(adminDir),
		dock:        os.DirFS(dockDir),
		overlay:     os.DirFS(overlayDir),
		leaderboard: os.DirFS(leaderboardDir),
		shared:      os.DirFS(sharedDir),
	}, nil
}

func serveFSFile(w http.ResponseWriter, r *http.Request, fsys fs.FS, name string) {
	file, err := fsys.Open(name)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer func() { _ = file.Close() }()

	stat, err := file.Stat()
	if err != nil {
		http.Error(w, "cannot stat file", http.StatusInternalServerError)
		return
	}

	reader, ok := file.(io.ReadSeeker)
	if !ok {
		http.Error(w, "cannot read file", http.StatusInternalServerError)
		return
	}

	http.ServeContent(w, r, name, stat.ModTime(), reader)
}
