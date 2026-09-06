package api

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/leaderboard"
)

const wireLeaderboardVisibilityType = "leaderboard_visibility"

type wireLeaderboardVisibility struct {
	Type string `json:"type"`
	leaderboard.Snapshot
}

func leaderboardVisibilityWirePayload(snapshot leaderboard.Snapshot) ([]byte, error) {
	payload, err := json.Marshal(wireLeaderboardVisibility{
		Type:     wireLeaderboardVisibilityType,
		Snapshot: snapshot,
	})
	if err != nil {
		return nil, errors.Errorf("marshal leaderboard visibility wire event: %w", err)
	}
	return payload, nil
}

type leaderboardVisibilityHandler struct {
	controller *leaderboard.Controller
}

func (h *leaderboardVisibilityHandler) handleGet(w http.ResponseWriter, r *http.Request) {
	h.call(w, r, func(ctx context.Context) (leaderboard.Snapshot, error) {
		return h.controller.Snapshot(ctx)
	})
}

type showLeaderboardRequest struct {
	DurationSeconds *int `json:"duration_seconds,omitempty"`
}

func (h *leaderboardVisibilityHandler) handleShow(w http.ResponseWriter, r *http.Request) {
	var request showLeaderboardRequest
	if !decodeLeaderboardAction(w, r, &request) {
		return
	}

	duration := time.Duration(0)
	if request.DurationSeconds != nil {
		duration = time.Duration(*request.DurationSeconds) * time.Second
	}
	h.call(w, r, func(ctx context.Context) (leaderboard.Snapshot, error) {
		return h.controller.Show(ctx, duration)
	})
}

func (h *leaderboardVisibilityHandler) handleHide(w http.ResponseWriter, r *http.Request) {
	if !decodeLeaderboardAction(w, r, &struct{}{}) {
		return
	}
	h.call(w, r, func(ctx context.Context) (leaderboard.Snapshot, error) {
		return h.controller.Hide(ctx)
	})
}

func (h *leaderboardVisibilityHandler) handlePin(w http.ResponseWriter, r *http.Request) {
	if !decodeLeaderboardAction(w, r, &struct{}{}) {
		return
	}
	h.call(w, r, func(ctx context.Context) (leaderboard.Snapshot, error) {
		return h.controller.Pin(ctx)
	})
}

func (h *leaderboardVisibilityHandler) handleResume(w http.ResponseWriter, r *http.Request) {
	if !decodeLeaderboardAction(w, r, &struct{}{}) {
		return
	}
	h.call(w, r, func(ctx context.Context) (leaderboard.Snapshot, error) {
		return h.controller.Resume(ctx)
	})
}

func (h *leaderboardVisibilityHandler) call(
	w http.ResponseWriter,
	r *http.Request,
	action func(context.Context) (leaderboard.Snapshot, error),
) {
	if h.controller == nil {
		writeError(w, http.StatusServiceUnavailable, "leaderboard visibility unavailable")
		return
	}
	snapshot, err := action(r.Context())
	if errors.Is(err, leaderboard.ErrInvalidDuration) {
		writeError(w, http.StatusBadRequest, "duration_seconds must be between 5 and 60")
		return
	}
	if errors.Is(err, leaderboard.ErrUnavailable) || errors.Is(err, leaderboard.ErrBusy) {
		writeError(w, http.StatusServiceUnavailable, "leaderboard visibility unavailable")
		return
	}
	if err != nil {
		clog.Errorf(r.Context(), "update leaderboard visibility: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to update leaderboard visibility")
		return
	}
	writeJSON(w, http.StatusOK, snapshot)
}

func decodeLeaderboardAction(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(io.LimitReader(r.Body, 4096))
	decoder.DisallowUnknownFields()
	err := decoder.Decode(target)
	if errors.Is(err, io.EOF) {
		return true
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return false
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return false
	}
	return true
}
