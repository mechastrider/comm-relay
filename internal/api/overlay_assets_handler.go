package api

import (
	"io"
	"net/http"
	"strings"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/overlayassets"
)

type overlayAssetsHandler struct {
	dir string
}

func newOverlayAssetsHandler(configPath string) *overlayAssetsHandler {
	return &overlayAssetsHandler{dir: overlayassets.DirForConfig(configPath)}
}

type overlayAssetUploadResponse struct {
	Filename string `json:"filename"`
}

func (h *overlayAssetsHandler) handleUpload(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	r.Body = http.MaxBytesReader(w, r.Body, overlayassets.MaxBytes+64<<10)
	if err := r.ParseMultipartForm(overlayassets.MaxBytes + 64<<10); err != nil {
		writeError(w, http.StatusBadRequest, "file is too large or invalid")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer func() { _ = file.Close() }()

	data, err := overlayassets.ReadLimited(io.LimitReader(file, overlayassets.MaxBytes+1))
	if err != nil {
		if isOverlayAssetTooLarge(err) {
			writeError(w, http.StatusBadRequest, "file is too large")
			return
		}
		clog.Errorf(ctx, "read overlay asset %s: %w", header.Filename, err)
		writeError(w, http.StatusBadRequest, "could not read file")
		return
	}

	name, err := overlayassets.Save(h.dir, data)
	if err != nil {
		switch {
		case errors.Is(err, overlayassets.ErrUnsupportedType), errors.Is(err, overlayassets.ErrUnsafeSVG):
			writeError(w, http.StatusBadRequest, "file type is not allowed")
		case errors.Is(err, overlayassets.ErrModernImageFormat):
			writeError(w, http.StatusBadRequest, "HEIC and AVIF are not supported; use PNG or JPEG")
		default:
			clog.Errorf(ctx, "save overlay asset: %w", err)
			writeError(w, http.StatusBadRequest, "could not store file")
		}
		return
	}

	writeJSON(w, http.StatusOK, overlayAssetUploadResponse{Filename: name})
}

func (h *overlayAssetsHandler) handleGet(w http.ResponseWriter, r *http.Request) {
	name := strings.TrimSpace(r.PathValue("filename"))
	overlayassets.ServeFile(w, r, h.dir, name)
}

func isOverlayAssetTooLarge(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(err.Error(), "exceeds")
}
