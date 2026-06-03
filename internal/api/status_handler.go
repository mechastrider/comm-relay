package api

import (
	"net/http"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/status"
)

type connectorState string

const (
	connectorStateDisabled     connectorState = "disabled"
	connectorStateDisconnected connectorState = "disconnected"
)

type statusHandler struct {
	store    *config.Store
	registry *status.Registry
}

func newStatusHandler(store *config.Store, registry *status.Registry) *statusHandler {
	return &statusHandler{store: store, registry: registry}
}

type statusResponse struct {
	Twitch  twitchStatusResponse   `json:"twitch"`
	YouTube platformStatusResponse `json:"youtube"`
	VK      platformStatusResponse `json:"vk"`
}

type twitchStatusResponse struct {
	Enabled bool           `json:"enabled"`
	Channel string         `json:"channel"`
	State   connectorState `json:"state"`
}

type platformStatusResponse struct {
	Enabled        bool           `json:"enabled"`
	State          connectorState `json:"state"`
	OAuthConnected bool           `json:"oauth_connected,omitempty"`
	Detail         string         `json:"detail,omitempty"`
}

func (h *statusHandler) handleGet(w http.ResponseWriter, r *http.Request) {
	cfg := h.store.Snapshot()

	writeJSON(w, http.StatusOK, statusResponse{
		Twitch: twitchStatusResponse{
			Enabled: cfg.Twitch.Enabled,
			Channel: cfg.Twitch.Channel,
			State:   twitchConnectorState(cfg.Twitch),
		},
		YouTube: youtubeStatusResponse(cfg, h.registry),
		VK: platformStatusResponse{
			Enabled: cfg.VK.Enabled,
			State:   platformConnectorState(cfg.VK.Enabled),
		},
	})
}

func twitchConnectorState(twitch config.TwitchConfig) connectorState {
	if !twitch.Enabled {
		return connectorStateDisabled
	}
	return connectorStateDisconnected
}

func platformConnectorState(enabled bool) connectorState {
	if !enabled {
		return connectorStateDisabled
	}
	return connectorStateDisconnected
}

func youtubeStatusResponse(cfg config.Config, registry *status.Registry) platformStatusResponse {
	resp := platformStatusResponse{
		Enabled:        cfg.YouTube.Enabled,
		OAuthConnected: cfg.YouTube.OAuth.Connected(),
	}

	if !cfg.YouTube.Enabled {
		resp.State = connectorStateDisabled
		return resp
	}

	if registry != nil {
		snap := registry.YouTube()
		if snap.State != "" {
			resp.State = connectorState(snap.State)
			resp.Detail = snap.Detail
			return resp
		}
	}

	resp.State = connectorStateDisconnected
	if !cfg.YouTube.OAuth.Connected() {
		resp.Detail = "Connect YouTube in admin (OAuth)."
	}
	return resp
}
