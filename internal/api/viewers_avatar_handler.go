package api

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/overlayassets"
	"github.com/mechastrider/comm-relay/internal/store"
)

func (h *viewersHandler) handleAvatarUpload(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}
	if h.assetsDir == "" {
		writeError(w, http.StatusServiceUnavailable, "overlay assets unavailable")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, overlayassets.MaxUploadBodyBytes)
	if err := r.ParseMultipartForm(overlayassets.MaxUploadBodyBytes); err != nil {
		writeError(w, http.StatusBadRequest, "file is too large or invalid")
		return
	}

	viewerID := strings.TrimSpace(r.FormValue("id"))
	if viewerID == "" {
		writeError(w, http.StatusBadRequest, "id is required")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer func() { _ = file.Close() }()

	data, err := overlayassets.ReadLimited(file, overlayassets.MaxViewerAvatarBytes)
	if err != nil {
		if isOverlayAssetTooLarge(err) {
			writeError(w, http.StatusBadRequest, "file is too large")
			return
		}
		clog.Errorf(ctx, "read viewer avatar %s: %w", header.Filename, err)
		writeError(w, http.StatusBadRequest, "could not read file")
		return
	}

	filename, err := overlayassets.Save(h.assetsDir, overlayassets.KindViewerAvatar, data)
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
		default:
			clog.Errorf(ctx, "save viewer avatar: %w", err)
			writeError(w, http.StatusBadRequest, "could not store file")
		}
		return
	}

	previous, err := h.viewerStore.SetCustomAvatar(viewerID, filename)
	if errors.Is(err, store.ErrNotFound) {
		_ = overlayassets.Delete(h.assetsDir, filename)
		writeError(w, http.StatusNotFound, "viewer not found")
		return
	}
	if err != nil {
		_ = overlayassets.Delete(h.assetsDir, filename)
		clog.Errorf(ctx, "set custom avatar: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to store custom portrait")
		return
	}

	if err := h.deleteUnreferencedOverlayAsset(previous); err != nil {
		clog.Warn(ctx, "delete replaced custom avatar file",
			slog.String("filename", previous),
			slog.Any("error", err),
		)
	}

	if h.publisher != nil {
		h.publisher.Schedule()
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"updated":  true,
		"filename": filename,
	})
}

type clearViewerAvatarRequest struct {
	ID string `json:"id"`
}

func (h *viewersHandler) handleAvatarClear(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}

	var request clearViewerAvatarRequest
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if strings.TrimSpace(request.ID) == "" {
		writeError(w, http.StatusBadRequest, "id is required")
		return
	}

	cleared, err := h.viewerStore.ClearCustomAvatar(request.ID)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "viewer not found")
		return
	}
	if err != nil {
		clog.Errorf(ctx, "clear custom avatar: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to clear custom portrait")
		return
	}

	if err := h.deleteUnreferencedOverlayAsset(cleared); err != nil {
		clog.Warn(ctx, "delete cleared custom avatar file",
			slog.String("filename", cleared),
			slog.Any("error", err),
		)
	}

	if h.publisher != nil {
		h.publisher.Schedule()
	}

	writeJSON(w, http.StatusOK, map[string]bool{"updated": true})
}

func (h *viewersHandler) deleteUnreferencedOverlayAsset(filename string) error {
	filename = strings.TrimSpace(filename)
	if filename == "" || h.assetsDir == "" || h.viewerStore == nil {
		return nil
	}

	inUse, err := h.viewerStore.OverlayAssetFilenameInUse(filename)
	if err != nil {
		return errors.Errorf("check overlay asset reference: %w", err)
	}
	if inUse {
		return nil
	}

	if err := overlayassets.Delete(h.assetsDir, filename); err != nil {
		return errors.Errorf("delete overlay asset: %w", err)
	}
	return nil
}
