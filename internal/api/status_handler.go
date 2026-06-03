package api

import (
	"net/http"

	"github.com/mechastrider/comm-relay/internal/config"
)

type connectorState string

const (
	connectorStateDisabled     connectorState = "disabled"
	connectorStateDisconnected connectorState = "disconnected"
)

type statusHandler struct {
	store *config.Store
}

func newStatusHandler(store *config.Store) *statusHandler {
	return &statusHandler{store: store}
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
	Enabled bool           `json:"enabled"`
	State   connectorState `json:"state"`
}

func (h *statusHandler) handleGet(w http.ResponseWriter, r *http.Request) {
	cfg := h.store.Snapshot()

	writeJSON(w, http.StatusOK, statusResponse{
		Twitch: twitchStatusResponse{
			Enabled: cfg.Twitch.Enabled,
			Channel: cfg.Twitch.Channel,
			State:   twitchConnectorState(cfg.Twitch),
		},
		YouTube: platformStatusResponse{
			Enabled: cfg.YouTube.Enabled,
			State:   platformConnectorState(cfg.YouTube.Enabled),
		},
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
