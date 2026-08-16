package api

import (
	"net/http"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/status"
	"github.com/mechastrider/comm-relay/internal/emote"
	"github.com/mechastrider/comm-relay/internal/runtime"
	"github.com/mechastrider/comm-relay/internal/version"
)

type diagnosticsHandler struct {
	store      *config.Store
	registry   *status.Registry
	hub        *Hub
	runtime    *runtime.Info
	emoteCache *emote.Cache
}

func newDiagnosticsHandler(store *config.Store, registry *status.Registry, hub *Hub, rt *runtime.Info, emoteCache *emote.Cache) *diagnosticsHandler {
	return &diagnosticsHandler{
		store:      store,
		registry:   registry,
		hub:        hub,
		runtime:    rt,
		emoteCache: emoteCache,
	}
}

type diagnosticsResponse struct {
	AppVersion        string            `json:"app_version"`
	UptimeSeconds     int64             `json:"uptime_seconds"`
	WebSocketClients  int               `json:"websocket_clients"`
	EnabledConnectors []string          `json:"enabled_connectors"`
	MessageCounts     map[string]uint64 `json:"message_counts"`
	Connectors        statusResponse    `json:"connectors"`
	EmoteCache        emote.Snapshot    `json:"emote_cache"`
}

func (h *diagnosticsHandler) handleGet(w http.ResponseWriter, r *http.Request) {
	cfg := h.store.Snapshot()

	var messageCounts map[string]uint64
	if h.registry != nil {
		messageCounts = h.registry.MessageCounts()
	}
	if messageCounts == nil {
		messageCounts = map[string]uint64{}
	}

	uptimeSeconds := int64(0)
	if h.runtime != nil {
		uptimeSeconds = int64(h.runtime.Uptime().Seconds())
	}

	wsClients := 0
	if h.hub != nil {
		wsClients = h.hub.ClientCount()
	}

	emoteCache := emote.Snapshot{Providers: map[string]emote.ProviderSnapshot{}}
	if h.emoteCache != nil {
		emoteCache = h.emoteCache.Diagnostics()
	}

	writeJSON(w, http.StatusOK, diagnosticsResponse{
		AppVersion:        version.Version,
		UptimeSeconds:     uptimeSeconds,
		WebSocketClients:  wsClients,
		EnabledConnectors: enabledConnectors(cfg),
		MessageCounts:     messageCounts,
		Connectors: statusResponse{
			Twitch:  twitchStatusResponse(cfg, h.registry),
			YouTube: youtubeStatusResponse(cfg, h.registry),
			VK:      vkStatusResponse(cfg, h.registry),
		},
		EmoteCache: emoteCache,
	})
}

func enabledConnectors(cfg config.Config) []string {
	out := make([]string, 0, 3)
	if cfg.Twitch.Enabled {
		out = append(out, status.PlatformTwitch)
	}
	if cfg.YouTube.Enabled {
		out = append(out, status.PlatformYouTube)
	}
	if cfg.VK.Enabled {
		out = append(out, status.PlatformVK)
	}
	return out
}
