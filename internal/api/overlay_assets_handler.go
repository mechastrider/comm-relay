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
)

type overlayAssetsHandler struct {
	store *config.Store
}

func newOverlayAssetsHandler(store *config.Store) *overlayAssetsHandler {
	return &overlayAssetsHandler{store: store}
}

type overlayAssetUploadResponse struct {
	Filename string `json:"filename"`
}

func (h *overlayAssetsHandler) handleUpload(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	if err := r.ParseMultipartForm(overlayassets.MaxUploadBytes + 1024); err != nil {
		writeError(w, http.StatusBadRequest, "invalid upload")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer func() {
		_ = file.Close()
	}()

	filename := strings.TrimSpace(r.FormValue("filename"))
	if filename == "" && header != nil {
		filename = header.Filename
	}
	if filename == "" {
		writeError(w, http.StatusBadRequest, "filename is required")
		return
	}

	safe, err := overlayassets.SaveUploaded(h.store.Path(), filename, file)
	if err != nil {
		if errors.Is(err, overlayassets.ErrUploadTooLarge) || errors.Is(err, overlayassets.ErrInvalidFilename) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		clog.Errorf(ctx, "save overlay asset: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to store asset")
		return
	}

	writeJSON(w, http.StatusOK, overlayAssetUploadResponse{Filename: safe})
}

func (h *overlayAssetsHandler) handleServe(w http.ResponseWriter, r *http.Request) {
	filename := r.PathValue("filename")
	if filename == "" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	if err := overlayassets.Serve(h.store.Path(), filename, w, r); err != nil {
		if errors.Is(err, overlayassets.ErrAssetNotFound) {
			writeError(w, http.StatusNotFound, "not found")
			return
		}
		if errors.Is(err, overlayassets.ErrInvalidFilename) {
			writeError(w, http.StatusBadRequest, "invalid asset")
			return
		}
		clog.Errorf(r.Context(), "serve overlay asset: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to serve asset")
	}
}

type overlayPresetDuplicateRequest struct {
	SourceID string `json:"source_id"`
	NewID    string `json:"new_id"`
	NewName  string `json:"new_name"`
}

func (h *configHandler) handlePresetDuplicate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		clog.Errorf(ctx, "read preset duplicate body: %w", err)
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var request overlayPresetDuplicateRequest
	if err := json.Unmarshal(body, &request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}

	sourceID := strings.TrimSpace(request.SourceID)
	newID := strings.TrimSpace(request.NewID)
	newName := strings.TrimSpace(request.NewName)
	if sourceID == "" || newID == "" || newName == "" {
		writeError(w, http.StatusBadRequest, "source_id, new_id, and new_name are required")
		return
	}

	if err := h.store.Mutate(func(cfg *config.Config) error {
		cfg.Overlay.EnsurePresets()
		source, ok := cfg.Overlay.PresetByID(sourceID)
		if !ok {
			return errors.New("source preset not found")
		}
		if _, exists := cfg.Overlay.PresetByID(newID); exists {
			return errors.New("preset id already exists")
		}
		if len(cfg.Overlay.Presets) >= config.MaxOverlayPresets {
			return errors.New("maximum presets reached")
		}
		clone := source
		clone.ID = newID
		clone.Name = newName
		cfg.Overlay.Presets = append(cfg.Overlay.Presets, clone)
		return nil
	}); err != nil {
		if strings.Contains(err.Error(), "not found") ||
			strings.Contains(err.Error(), "already exists") ||
			strings.Contains(err.Error(), "maximum presets") {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if fields := config.ValidationFields(err); len(fields) > 0 {
			writeFieldErrors(w, http.StatusBadRequest, "Check the highlighted fields.", fields)
			return
		}
		clog.Errorf(ctx, "duplicate overlay preset: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to duplicate preset")
		return
	}

	h.broadcastOverlaySettings(ctx)
	writeJSON(w, http.StatusOK, h.store.Snapshot().Public())
}
