package api

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/muonsoft/clog"

	"github.com/mechastrider/comm-relay/internal/store"
)

type viewerAmmoResponse struct {
	Remaining int `json:"remaining"`
	Capacity  int `json:"capacity"`
}

type viewerVisualStatusResponse struct {
	Platform  string                   `json:"platform,omitempty"`
	UserID    string                   `json:"user_id,omitempty"`
	ViewerID  string                   `json:"viewer_id"`
	SessionID string                   `json:"session_id"`
	Level     progressionLevelResponse `json:"level"`
	Like      viewerAmmoResponse       `json:"like"`
	Buff      viewerAmmoResponse       `json:"buff"`
}

func visualStatusFromStore(status store.ViewerVisualStatus) viewerVisualStatusResponse {
	return viewerVisualStatusResponse{
		Platform: status.Identity.Platform, UserID: status.Identity.UserID,
		ViewerID: status.ViewerID, SessionID: status.SessionID,
		Level: progressionLevelFromStore(status.Level),
		Like:  viewerAmmoResponse{Remaining: status.LikeRemaining, Capacity: status.Level.LikeQuota},
		Buff:  viewerAmmoResponse{Remaining: status.BuffRemaining, Capacity: status.Level.BuffQuota},
	}
}

func (h *progressionHandler) broadcastLevelChange() {
	if h.hub != nil {
		h.hub.Broadcast([]byte(`{"type":"viewer_status_changed"}`))
	}
}

func (h *viewersHandler) handleVisualStatus(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}
	var request struct {
		Identities []store.ViewerStatusIdentity `json:"identities"`
	}
	decoder := json.NewDecoder(io.LimitReader(r.Body, 64<<10))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil || rejectTrailingJSON(decoder) != nil || len(request.Identities) > 100 {
		writeError(w, http.StatusBadRequest, "invalid status request")
		return
	}
	statuses, err := h.viewerStore.ViewerVisualStatuses(request.Identities)
	if err != nil {
		clog.Errorf(r.Context(), "read viewer visual statuses: %w", err)
		writeError(w, http.StatusInternalServerError, "viewer status unavailable")
		return
	}
	items := make([]viewerVisualStatusResponse, 0, len(statuses))
	for _, status := range statuses {
		items = append(items, visualStatusFromStore(status))
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, http.StatusOK, struct {
		Statuses []viewerVisualStatusResponse `json:"statuses"`
	}{Statuses: items})
}
