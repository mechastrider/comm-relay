package api

import (
	"net/http"
	"strings"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/status"
	"github.com/mechastrider/comm-relay/internal/youtube/channel"
	"github.com/mechastrider/comm-relay/internal/youtube/videoid"
)

type connectorState string

const (
	connectorStateDisabled     connectorState = "disabled"
	connectorStateDisconnected connectorState = "disconnected"
	connectorStateConnecting   connectorState = "connecting"
	connectorStateConnected    connectorState = "connected"
	connectorStateReconnecting connectorState = "reconnecting"
	connectorStateError        connectorState = "error"
)

type statusHandler struct {
	store    *config.Store
	registry *status.Registry
}

func newStatusHandler(store *config.Store, registry *status.Registry) *statusHandler {
	return &statusHandler{store: store, registry: registry}
}

type statusResponse struct {
	Twitch  platformStatusResponse `json:"twitch"`
	YouTube platformStatusResponse `json:"youtube"`
	VK      platformStatusResponse `json:"vk"`
}

type platformStatusResponse struct {
	Enabled        bool           `json:"enabled"`
	Channel        string         `json:"channel,omitempty"`
	ConnectionMode string         `json:"connection_mode,omitempty"`
	VideoID        string         `json:"video_id,omitempty"`
	State          connectorState `json:"state"`
	OAuthConnected bool           `json:"oauth_connected,omitempty"`
	Detail         string         `json:"detail,omitempty"`
	LastError      string         `json:"last_error,omitempty"`
	MessageCount   uint64         `json:"message_count"`
}

func (h *statusHandler) handleGet(w http.ResponseWriter, r *http.Request) {
	cfg := h.store.Snapshot()

	writeJSON(w, http.StatusOK, statusResponse{
		Twitch:  twitchStatusResponse(cfg, h.registry),
		YouTube: youtubeStatusResponse(cfg, h.registry),
		VK:      vkStatusResponse(cfg, h.registry),
	})
}

func twitchStatusResponse(cfg config.Config, registry *status.Registry) platformStatusResponse {
	resp := platformStatusResponse{
		Enabled: cfg.Twitch.Enabled,
		Channel: cfg.Twitch.Channel,
	}

	if !cfg.Twitch.Enabled {
		resp.State = connectorStateDisabled
		return resp
	}

	if snap, ok := registrySnapshot(registry, status.PlatformTwitch); ok {
		applyRegistrySnapshot(&resp, snap)
		return resp
	}

	resp.State = connectorStateDisconnected
	if strings.TrimSpace(cfg.Twitch.Channel) == "" {
		resp.Detail = "Set Twitch channel in admin."
	}
	return resp
}

func vkStatusResponse(cfg config.Config, registry *status.Registry) platformStatusResponse {
	resp := platformStatusResponse{
		Enabled: cfg.VK.Enabled,
		Channel: cfg.VK.Channel,
	}

	if !cfg.VK.Enabled {
		resp.State = connectorStateDisabled
		return resp
	}

	if snap, ok := registrySnapshot(registry, status.PlatformVK); ok {
		applyRegistrySnapshot(&resp, snap)
		return resp
	}

	resp.State = connectorStateDisconnected
	if strings.TrimSpace(cfg.VK.Channel) == "" {
		resp.Detail = "Set VK channel slug in admin."
	}
	return resp
}

func youtubeStatusResponse(cfg config.Config, registry *status.Registry) platformStatusResponse {
	connectionMode := cfg.YouTube.ConnectionMode
	if connectionMode == "" {
		connectionMode = config.YouTubeConnectionModeAPI
	}

	resp := platformStatusResponse{
		Enabled:        cfg.YouTube.Enabled,
		ConnectionMode: connectionMode,
	}

	if connectionMode == config.YouTubeConnectionModePage {
		if videoID, err := videoid.ParseInput(cfg.YouTube.VideoInput); err == nil {
			resp.VideoID = videoID
		}
		if handle := strings.TrimSpace(cfg.YouTube.ChannelHandle); handle != "" {
			if ref, err := channel.ParseRef(handle); err == nil {
				if ref.Handle != "" {
					resp.Channel = ref.Handle
				} else {
					resp.Channel = ref.ChannelID
				}
			}
		}
	} else {
		resp.OAuthConnected = cfg.YouTube.OAuth.Connected()
	}

	if !cfg.YouTube.Enabled {
		resp.State = connectorStateDisabled
		return resp
	}

	if snap, ok := registrySnapshot(registry, status.PlatformYouTube); ok {
		applyRegistrySnapshot(&resp, snap)
		return resp
	}

	resp.State = connectorStateDisconnected
	if connectionMode == config.YouTubeConnectionModePage {
		if strings.TrimSpace(cfg.YouTube.VideoInput) == "" && strings.TrimSpace(cfg.YouTube.ChannelHandle) == "" {
			resp.Detail = "Set channel handle or live video URL in admin."
		}
		return resp
	}
	if !cfg.YouTube.OAuth.Connected() {
		resp.Detail = "Connect YouTube in admin (OAuth)."
	}
	return resp
}

func registrySnapshot(registry *status.Registry, platform string) (status.Snapshot, bool) {
	if registry == nil {
		return status.Snapshot{}, false
	}
	snap := registry.Get(platform)
	if snap.State == "" {
		return status.Snapshot{}, false
	}
	return snap, true
}

func applyRegistrySnapshot(resp *platformStatusResponse, snap status.Snapshot) {
	resp.State = connectorState(snap.State)
	resp.Detail = snap.Detail
	resp.LastError = snap.LastError
	resp.MessageCount = snap.MessageCount
}
