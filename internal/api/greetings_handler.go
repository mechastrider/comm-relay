package api

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/command"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/store"
)

type greetingsHandler struct {
	viewerStore *store.Store
	cfgStore    *config.Store
	hub         *Hub
}

func newGreetingsHandler(viewerStore *store.Store, cfgStore *config.Store, hub *Hub) *greetingsHandler {
	return &greetingsHandler{viewerStore: viewerStore, cfgStore: cfgStore, hub: hub}
}

type greetingResponse struct {
	ID             string `json:"id"`
	Enabled        bool   `json:"enabled"`
	SplashTemplate string `json:"splash_template"`
	Sound          string `json:"sound"`
	DurationMs     int    `json:"duration_ms"`
	ImageAsset     string `json:"image_asset,omitempty"`
	SoundFile      string `json:"sound_file,omitempty"`
	SoundVolume    int    `json:"sound_volume"`
	Layout         string `json:"layout"`
	ImageFit       string `json:"image_fit"`
	ImageSizePct   int    `json:"image_size_pct"`
}

type greetingsListResponse struct {
	Greetings []greetingResponse `json:"greetings"`
}

func greetingFromStore(g store.Greeting) greetingResponse {
	return greetingResponse{ID: string(g.ID), Enabled: g.Enabled, SplashTemplate: g.SplashTemplate, Sound: g.Sound, DurationMs: g.DurationMs, ImageAsset: g.ImageAsset, SoundFile: g.SoundFile, SoundVolume: g.SoundVolume, Layout: g.Layout, ImageFit: g.ImageFit, ImageSizePct: g.ImageSizePct}
}

func (h *greetingsHandler) handleList(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}
	items, err := h.viewerStore.ListGreetings()
	if err != nil {
		clog.Errorf(r.Context(), "list greetings: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to list greetings")
		return
	}
	response := make([]greetingResponse, 0, len(items))
	for _, item := range items {
		response = append(response, greetingFromStore(item))
	}
	writeJSON(w, http.StatusOK, greetingsListResponse{Greetings: response})
}

type greetingRequest struct {
	ID             string `json:"id"`
	Enabled        bool   `json:"enabled"`
	SplashTemplate string `json:"splash_template"`
	Sound          string `json:"sound"`
	DurationMs     int    `json:"duration_ms"`
	ImageAsset     string `json:"image_asset"`
	SoundFile      string `json:"sound_file"`
	SoundVolume    *int   `json:"sound_volume"`
	Layout         string `json:"layout"`
	ImageFit       string `json:"image_fit"`
	ImageSizePct   *int   `json:"image_size_pct"`
	Viewer         string `json:"viewer"`
	Message        string `json:"message"`
}

func greetingInput(request greetingRequest) store.Greeting {
	return store.Greeting{ID: store.GreetingKind(request.ID), Enabled: request.Enabled, SplashTemplate: request.SplashTemplate, Sound: request.Sound, DurationMs: request.DurationMs, ImageAsset: request.ImageAsset, SoundFile: request.SoundFile, SoundVolume: catalogSoundVolumeFromRequest(request.SoundVolume), Layout: request.Layout, ImageFit: request.ImageFit, ImageSizePct: catalogImageSizePctFromRequest(request.ImageSizePct)}
}

func decodeGreetingRequest(w http.ResponseWriter, r *http.Request) (greetingRequest, bool) {
	var request greetingRequest
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil || rejectTrailingJSON(decoder) != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return greetingRequest{}, false
	}
	return request, true
}

func writeGreetingError(w http.ResponseWriter, r *http.Request, action string, err error) {
	if fields := store.CatalogMediaFields(err); len(fields) > 0 {
		writeFieldErrors(w, http.StatusBadRequest, "Check the highlighted fields.", fields)
		return
	}
	if errors.Is(err, store.ErrGreetingNotFound) {
		writeError(w, http.StatusNotFound, "greeting not found")
		return
	}
	clog.Errorf(r.Context(), "%s greeting: %w", action, err)
	writeError(w, http.StatusBadRequest, err.Error())
}

func (h *greetingsHandler) handleUpdate(w http.ResponseWriter, r *http.Request) {
	if h.viewerStore == nil {
		writeError(w, http.StatusServiceUnavailable, "viewer store unavailable")
		return
	}
	request, ok := decodeGreetingRequest(w, r)
	if !ok {
		return
	}
	if fields := greetingRequestFields(request, false); len(fields) > 0 {
		writeFieldErrors(w, http.StatusBadRequest, "Check the highlighted fields.", fields)
		return
	}
	greeting, err := h.viewerStore.UpdateGreeting(greetingInput(request))
	if err != nil {
		writeGreetingError(w, r, "update", err)
		return
	}
	writeJSON(w, http.StatusOK, greetingFromStore(*greeting))
}

type greetingPreviewResponse struct {
	DeliveredClients int `json:"delivered_clients"`
}

func (h *greetingsHandler) handlePreview(w http.ResponseWriter, r *http.Request) {
	if h.hub == nil || h.cfgStore == nil {
		writeError(w, http.StatusServiceUnavailable, "greeting preview unavailable")
		return
	}
	request, ok := decodeGreetingRequest(w, r)
	if !ok {
		return
	}
	greeting := greetingInput(request)
	if !validPreviewGreeting(greeting) {
		writeError(w, http.StatusNotFound, "greeting not found")
		return
	}
	if fields := greetingRequestFields(request, true); len(fields) > 0 {
		writeFieldErrors(w, http.StatusBadRequest, "Check the highlighted fields.", fields)
		return
	}
	if err := validateGreetingPreview(greeting); err != nil {
		writeGreetingError(w, r, "preview", err)
		return
	}
	viewer := strings.TrimSpace(request.Viewer)
	if viewer == "" {
		viewer = "Studio Tester"
	}
	message := strings.TrimSpace(request.Message)
	if message == "" {
		message = "Hello from chat"
	}
	text := command.SubstituteTemplate(greeting.SplashTemplate, command.TemplateVars{Viewer: viewer, Streamer: h.cfgStore.Snapshot().StreamerDisplayName, Message: message})
	payload, err := greetingAlertWirePayload(greeting, viewer, "", text, time.Now())
	if err != nil {
		clog.Errorf(r.Context(), "build greeting preview: %w", err)
		writeError(w, http.StatusInternalServerError, "failed to preview greeting")
		return
	}
	writeJSON(w, http.StatusOK, greetingPreviewResponse{DeliveredClients: h.hub.BroadcastDebug(payload)})
}

func greetingRequestFields(request greetingRequest, preview bool) map[string]string {
	fields := map[string]string{}
	if strings.TrimSpace(request.SplashTemplate) == "" {
		fields["splash_template"] = "splash template is required"
	}
	if utf8.RuneCountInString(request.SplashTemplate) > 500 {
		fields["splash_template"] = "must be 500 characters or fewer"
	}
	if request.DurationMs < 1 {
		fields["duration_ms"] = "duration must be positive"
	}
	if preview {
		if utf8.RuneCountInString(request.Viewer) > 64 {
			fields["viewer"] = "must be 64 characters or fewer"
		}
		if utf8.RuneCountInString(request.Message) > 500 {
			fields["message"] = "must be 500 characters or fewer"
		}
	}
	return fields
}

func validPreviewGreeting(greeting store.Greeting) bool {
	return greeting.ID == store.GreetingNewViewer || greeting.ID == store.GreetingReturningViewer
}

func validateGreetingPreview(greeting store.Greeting) error {
	return store.ValidateGreetingPresentation(greeting)
}
