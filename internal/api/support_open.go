package api

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"

	"github.com/muonsoft/clog"

	"github.com/mechastrider/comm-relay/internal/browser"
)

const (
	supportTelegramURL = "https://t.me/mechastrider_apps/2"
	projectGitHubURL   = "https://github.com/mechastrider/comm-relay"
)

type supportOpenHandler struct {
	openURL browser.Opener
}

func newSupportOpenHandler() *supportOpenHandler {
	return &supportOpenHandler{
		openURL: browser.OpenURL,
	}
}

type supportOpenRequest struct {
	URL string `json:"url"`
}

type supportOpenResponse struct {
	Opened bool `json:"opened"`
}

func isAllowedSupportURL(url string) bool {
	switch url {
	case supportTelegramURL, projectGitHubURL:
		return true
	default:
		return false
	}
}

func (h *supportOpenHandler) handleOpen(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var request supportOpenRequest
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<10))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if request.URL == "" {
		writeError(w, http.StatusBadRequest, "url is required")
		return
	}
	if !isAllowedSupportURL(request.URL) {
		writeError(w, http.StatusBadRequest, "url is not allowlisted")
		return
	}

	if err := h.openURL(request.URL); err != nil {
		clog.Warn(ctx, "support open browser failed", slog.String("url", request.URL), slog.Any("error", err))
		writeError(w, http.StatusInternalServerError, "could not open browser")
		return
	}

	writeJSON(w, http.StatusOK, supportOpenResponse{Opened: true})
}
