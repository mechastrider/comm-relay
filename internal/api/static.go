package api

import (
	"io"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"

	webstatic "github.com/mechastrider/comm-relay/web"
	"github.com/muonsoft/errors"
)

type staticRoots struct {
	admin   fs.FS
	overlay fs.FS
}

func resolveStaticRoots(webRoot string) (staticRoots, error) {
	if webRoot != "" {
		return staticRootsFromDisk(webRoot)
	}

	admin, err := fs.Sub(webstatic.FS, "admin")
	if err != nil {
		return staticRoots{}, errors.Errorf("embedded admin assets: %w", err)
	}
	overlay, err := fs.Sub(webstatic.FS, "overlay")
	if err != nil {
		return staticRoots{}, errors.Errorf("embedded overlay assets: %w", err)
	}

	return staticRoots{admin: admin, overlay: overlay}, nil
}

func staticRootsFromDisk(webRoot string) (staticRoots, error) {
	adminDir := filepath.Join(webRoot, "admin")
	if _, err := os.Stat(filepath.Join(adminDir, "index.html")); err != nil {
		return staticRoots{}, err
	}

	overlayDir := filepath.Join(webRoot, "overlay")
	if _, err := os.Stat(filepath.Join(overlayDir, "index.html")); err != nil {
		return staticRoots{}, err
	}

	return staticRoots{
		admin:   os.DirFS(adminDir),
		overlay: os.DirFS(overlayDir),
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
