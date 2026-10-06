package streamtitle

import (
	"context"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/muonsoft/clog"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/netproxy"
)

const lookupTimeout = 5 * time.Second

// Suggestion is a live platform title that can prefill a new stream name.
type Suggestion struct {
	Title    string
	Platform string
}

// HTTPDoer performs outbound title lookups.
type HTTPDoer interface {
	Do(req *http.Request) (*http.Response, error)
}

// Options overrides outbound clients in tests. A nil Client uses the connector proxy settings.
type Options struct {
	Client             HTTPDoer
	YouTubeAccessToken string
}

// Suggest returns the first live title among enabled Twitch, YouTube, and VK connections.
// A platform that is offline or unreachable contributes nothing.
func Suggest(ctx context.Context, cfg config.Config, opts Options) Suggestion {
	type hit struct {
		platform string
		title    string
	}
	var (
		mu   sync.Mutex
		hits []hit
		wg   sync.WaitGroup
	)
	record := func(platform, title string) {
		if title == "" {
			return
		}
		mu.Lock()
		hits = append(hits, hit{platform: platform, title: title})
		mu.Unlock()
	}
	start := func(platform string, proxy *config.SOCKS5Config, lookup func(context.Context, HTTPDoer) string) {
		client := opts.client(proxy)
		if client == nil {
			return
		}
		wg.Add(1)
		go func() {
			defer wg.Done()
			record(platform, lookup(ctx, client))
		}()
	}

	if cfg.Twitch.Enabled {
		start("twitch", nil, func(ctx context.Context, client HTTPDoer) string {
			return twitchTitle(ctx, client, cfg.Twitch.Channel)
		})
	}
	if cfg.YouTube.Enabled {
		start("youtube", config.EffectiveSOCKS5(cfg.Network.SOCKS5, cfg.YouTube.UseProxy), func(ctx context.Context, client HTTPDoer) string {
			return youtubeTitle(ctx, client, cfg.YouTube, opts.YouTubeAccessToken)
		})
	}
	if cfg.VK.Enabled {
		start("vk", config.EffectiveSOCKS5(cfg.Network.SOCKS5, cfg.VK.UseProxy), func(ctx context.Context, client HTTPDoer) string {
			return vkTitle(ctx, client, cfg.VK.Channel)
		})
	}
	wg.Wait()

	found := map[string]string{}
	for _, item := range hits {
		if _, ok := found[item.platform]; !ok {
			found[item.platform] = item.title
		}
	}
	for _, platform := range []string{"twitch", "youtube", "vk"} {
		if title := found[platform]; title != "" {
			return Suggestion{Title: title, Platform: platform}
		}
	}
	return Suggestion{}
}

func (o Options) client(proxy *config.SOCKS5Config) HTTPDoer {
	if o.Client != nil {
		return o.Client
	}
	client, err := netproxy.HTTPClient(proxy, lookupTimeout)
	if err != nil {
		return nil
	}
	return client
}

func logLookupFailure(ctx context.Context, platform string, err error) {
	if err == nil || ctx.Err() != nil {
		return
	}
	clog.Debug(ctx, "stream title lookup failed", slog.String("platform", platform), slog.Any("error", err))
}
