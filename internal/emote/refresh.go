package emote

import (
	"context"
	"log/slog"
	"time"

	"github.com/muonsoft/clog"

	"github.com/mechastrider/comm-relay/internal/config"
)

const refreshInterval = 2 * time.Minute

// Refresher keeps global and active-channel emote metadata warm in the cache.
type Refresher struct {
	cache *Cache
	store *config.Store
}

// NewRefresher creates an emote metadata refresher.
func NewRefresher(cache *Cache, store *config.Store) *Refresher {
	return &Refresher{cache: cache, store: store}
}

// Run periodically refreshes provider metadata until ctx is cancelled.
func (r *Refresher) Run(ctx context.Context) {
	if r == nil || r.cache == nil || r.store == nil {
		return
	}

	r.refreshActive(ctx)

	ticker := time.NewTicker(refreshInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			r.refreshActive(ctx)
		}
	}
}

func (r *Refresher) refreshActive(ctx context.Context) {
	twitchCfg := r.store.Snapshot().Twitch
	if !twitchCfg.Enabled {
		return
	}

	channel := normalizeChannelLogin(twitchCfg.Channel)
	if channel == "" {
		return
	}

	r.cache.SetChannelActive("twitch", channel)

	emotesCfg := r.store.Snapshot().Overlay.Emotes
	providers := enabledProviders(emotesCfg)
	scopes := []Scope{GlobalScope(), ChannelScope("twitch", channel)}

	for _, provider := range providers {
		for _, scope := range scopes {
			if err := r.cache.Refresh(ctx, provider, scope); err != nil {
				clog.Warn(ctx, "emote metadata refresh failed",
					slog.String("provider", string(provider)),
					slog.String("scope", string(scope.Kind)),
					slog.Any("error", err),
				)
			}
		}
	}
}

func enabledProviders(cfg config.EmotesConfig) []ProviderID {
	out := make([]ProviderID, 0, 3)
	if cfg.SevenTV {
		out = append(out, Provider7TV)
	}
	if cfg.FFZ {
		out = append(out, ProviderFFZ)
	}
	if cfg.BTTV {
		out = append(out, ProviderBTTV)
	}
	return out
}
