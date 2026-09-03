package api

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/overlayassets"
	"github.com/mechastrider/comm-relay/internal/store"
)

type overlayAssetsHandler struct {
	dir         string
	configStore *config.Store
	viewerStore *store.Store
}

func newOverlayAssetsHandler(configStore *config.Store, viewerStore *store.Store) *overlayAssetsHandler {
	path := ""
	if configStore != nil {
		path = configStore.Path()
	}
	return &overlayAssetsHandler{
		dir:         overlayassets.DirForConfig(path),
		configStore: configStore,
		viewerStore: viewerStore,
	}
}

type overlayAssetUploadResponse struct {
	Filename string `json:"filename"`
}

func (h *overlayAssetsHandler) handleUpload(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	r.Body = http.MaxBytesReader(w, r.Body, overlayassets.MaxUploadBodyBytes)
	if err := r.ParseMultipartForm(overlayassets.MaxUploadBodyBytes); err != nil {
		writeError(w, http.StatusBadRequest, "file is too large or invalid")
		return
	}

	kind, err := overlayassets.ParseKind(r.FormValue("kind"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "kind is not allowed")
		return
	}
	limit := overlayassets.MaxPanelBytes
	switch kind {
	case overlayassets.KindAlertImage:
		limit = overlayassets.MaxAlertImageBytes
	case overlayassets.KindAlertSound:
		limit = overlayassets.MaxAlertSoundBytes
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer func() { _ = file.Close() }()

	data, err := overlayassets.ReadLimited(file, limit)
	if err != nil {
		if isOverlayAssetTooLarge(err) {
			writeError(w, http.StatusBadRequest, "file is too large")
			return
		}
		clog.Errorf(ctx, "read overlay asset %s: %w", header.Filename, err)
		writeError(w, http.StatusBadRequest, "could not read file")
		return
	}

	name, err := overlayassets.Save(h.dir, kind, data)
	if err != nil {
		switch {
		case errors.Is(err, overlayassets.ErrUnsupportedType),
			errors.Is(err, overlayassets.ErrUnsafeSVG),
			errors.Is(err, overlayassets.ErrAnimatedImage):
			writeError(w, http.StatusBadRequest, "file type is not allowed")
		case errors.Is(err, overlayassets.ErrModernImageFormat):
			writeError(w, http.StatusBadRequest, "HEIC and AVIF are not supported; use PNG or JPEG")
		case errors.Is(err, overlayassets.ErrImageDimensions):
			writeError(w, http.StatusBadRequest, "image dimensions exceed the allowed limit")
		case errors.Is(err, overlayassets.ErrAudioDuration):
			writeError(w, http.StatusBadRequest, "audio duration must be between 1 and 15 seconds")
		case errors.Is(err, overlayassets.ErrInvalidAudio):
			writeError(w, http.StatusBadRequest, "audio file is not valid")
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

type overlayAssetDeleteRequest struct {
	Filename string `json:"filename"`
}

func (h *overlayAssetsHandler) handleDelete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var request overlayAssetDeleteRequest
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	name := strings.TrimSpace(request.Filename)
	if name == "" || !config.ValidOverlayAssetName(name) {
		writeError(w, http.StatusBadRequest, "filename is invalid")
		return
	}

	if !overlayassets.FileExists(h.dir, name) {
		writeError(w, http.StatusNotFound, "overlay asset not found")
		return
	}

	cfg := config.Config{}
	if h.configStore != nil {
		cfg = h.configStore.Snapshot()
	}
	referenced, err := overlayAssetReferenced(name, cfg, h.viewerStore)
	if err != nil {
		clog.Errorf(ctx, "check overlay asset reference: %w", err)
		writeError(w, http.StatusInternalServerError, "could not check overlay asset references")
		return
	}
	if referenced {
		writeError(w, http.StatusBadRequest, "overlay asset is still in use")
		return
	}

	if err := overlayassets.Delete(h.dir, name); err != nil {
		if strings.Contains(err.Error(), "not found") {
			writeError(w, http.StatusNotFound, "overlay asset not found")
			return
		}
		clog.Errorf(ctx, "delete overlay asset: %w", err)
		writeError(w, http.StatusBadRequest, "could not delete overlay asset")
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

func isOverlayAssetTooLarge(err error) bool {
	if err == nil {
		return false
	}
	return strings.Contains(err.Error(), "exceeds")
}
