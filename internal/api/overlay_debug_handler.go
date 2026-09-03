package api

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"unicode/utf8"

	"github.com/muonsoft/clog"
)

type overlayDebugHandler struct {
	runner *overlayDebugRunner
}

func newOverlayDebugHandler(hub *Hub) *overlayDebugHandler {
	return &overlayDebugHandler{runner: newOverlayDebugRunner(hub)}
}

func (h *overlayDebugHandler) handleFire(w http.ResponseWriter, r *http.Request) {
	var request overlayDebugRequest
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if err := rejectTrailingJSON(decoder); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if fields := validateOverlayDebugRequest(request); len(fields) > 0 {
		writeFieldErrors(w, http.StatusBadRequest, "Check the highlighted fields.", fields)
		return
	}

	response, err := h.runner.fire(request)
	if err != nil {
		clog.Errorf(r.Context(), "fire overlay debug scenario: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to start scenario")
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (h *overlayDebugHandler) handleReset(w http.ResponseWriter, r *http.Request) {
	if !isEmptyOverlayDebugReset(r) {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	writeJSON(w, http.StatusOK, h.runner.reset())
}

func isEmptyOverlayDebugReset(r *http.Request) bool {
	body, err := io.ReadAll(io.LimitReader(r.Body, (1<<20)+1))
	if err != nil || len(body) > 1<<20 {
		return false
	}
	body = bytes.TrimSpace(body)
	if len(body) == 0 {
		return true
	}
	if body[0] != '{' {
		return false
	}

	decoder := json.NewDecoder(bytes.NewReader(body))
	var fields map[string]json.RawMessage
	if err := decoder.Decode(&fields); err != nil || len(fields) != 0 {
		return false
	}
	return rejectTrailingJSON(decoder) == nil
}

func rejectTrailingJSON(decoder *json.Decoder) error {
	var trailing any
	err := decoder.Decode(&trailing)
	if err == io.EOF {
		return nil
	}
	if err == nil {
		return io.ErrUnexpectedEOF
	}
	return err
}

func validateOverlayDebugRequest(request overlayDebugRequest) map[string]string {
	fields := make(map[string]string)
	switch request.Scenario {
	case debugScenarioMessage, debugScenarioRewardedMessage, debugScenarioCommandAlert, debugScenarioLeaderboardUpdate, debugScenarioAlertBurst:
	default:
		fields["scenario"] = "select a supported scenario"
	}
	if utf8.RuneCountInString(request.DisplayName) > 64 {
		fields["display_name"] = "must be 64 characters or fewer"
	}
	if utf8.RuneCountInString(request.Message) > 500 {
		fields["message"] = "must be 500 characters or fewer"
	}
	if utf8.RuneCountInString(request.Label) > 80 {
		fields["label"] = "must be 80 characters or fewer"
	}
	if request.Points != nil && (*request.Points < 1 || *request.Points > 1000) {
		fields["points"] = "must be between 1 and 1000"
	}
	return fields
}
