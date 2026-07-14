package vk

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/retry"
	"github.com/mechastrider/comm-relay/internal/connector/status"
	"github.com/mechastrider/comm-relay/internal/imagelink"
)

const configPollInterval = 2 * time.Second

// Connector reads VK Live / VK Video chat via the public WebSocket API and publishes unified messages.
type Connector struct {
	bus       *bus.Bus
	store     *config.Store
	registry  *status.Registry
	newClient func(proxyCfg *config.SOCKS5Config) (chatClient, error)
}

// New creates a VK Live connector that reads settings from the config store.
func New(eventBus *bus.Bus, store *config.Store, registry *status.Registry) *Connector {
	return &Connector{
		bus:      eventBus,
		store:    store,
		registry: registry,
		newClient: func(proxyCfg *config.SOCKS5Config) (chatClient, error) {
			return newDefaultClient(proxyCfg)
		},
	}
}

// Run connects to VK Live chat until ctx is cancelled.
func (c *Connector) Run(ctx context.Context) error {
	clog.Info(ctx, "vk connector starting", slog.String("platform", platformVK))
	defer clog.Info(ctx, "vk connector stopped", slog.String("platform", platformVK))

	backoff := retry.NewBackoff(time.Second, 30*time.Second)

	for {
		if ctx.Err() != nil {
			return nil
		}

		vkCfg := c.store.Snapshot().VK
		cfg := c.store.Snapshot()
		proxyCfg := config.EffectiveSOCKS5(cfg.Network.SOCKS5, vkCfg.UseProxy)
		if !vkCfg.Enabled {
			c.setStatus(status.StateDisabled, "", "")
			backoff = backoff.Reset()
			if err := retry.Wait(ctx, configPollInterval); err != nil {
				return nil
			}
			continue
		}

		channel := normalizeChannel(vkCfg.Channel)
		if channel == "" {
			c.setStatus(status.StateError, "Set VK channel slug in admin.", "")
			if err := retry.Wait(ctx, configPollInterval); err != nil {
				return nil
			}
			continue
		}

		sessionCtx := clog.NewContext(ctx, slog.Default().With(
			slog.String("platform", platformVK),
			slog.String("channel", channel),
		))

		err := c.runSession(sessionCtx, channel, proxyCfg)
		if ctx.Err() != nil {
			return nil
		}

		if err != nil {
			clog.Errorf(sessionCtx, "vk session ended: %w", err)
			c.setStatusFromError(err)
		} else {
			clog.Info(sessionCtx, "vk session ended")
			c.setStatus(status.StateDisconnected, "", "")
		}

		wait := backoff.Current()
		c.setStatus(status.StateReconnecting, "", "")
		clog.Info(sessionCtx, "vk reconnect scheduled", slog.Duration("after", wait))
		if err := retry.Wait(ctx, wait); err != nil {
			return nil
		}

		backoff = backoff.Next()
	}
}

func (c *Connector) runSession(ctx context.Context, channel string, proxyCfg *config.SOCKS5Config) error {
	client, err := c.newClient(proxyCfg)
	if err != nil {
		return err
	}
	c.setStatus(status.StateConnecting, "", "")

	return client.RunSession(ctx, channel, func(raw []byte) {
		overlay := c.store.Snapshot().Overlay
		chatMsg, ok := MapWSMessage(raw, overlay.Emotes.VK)
		if !ok {
			return
		}
		if strings.TrimSpace(chatMsg.Message) == "" {
			return
		}
		imagelink.Enrich(&chatMsg, overlay.ImagePreviews)
		if err := c.bus.Publish(bus.ChatMessageReceived(chatMsg)); err != nil {
			clog.Errorf(ctx, "publish vk message: %w", err)
			return
		}
		c.setStatus(status.StateConnected, "", "")
	})
}

func (c *Connector) setStatus(state status.State, detail, lastError string) {
	if c.registry == nil {
		return
	}
	snap := c.registry.VK()
	snap.State = state
	snap.Detail = detail
	if lastError != "" {
		snap.LastError = lastError
	}
	if state == status.StateConnected {
		snap.LastError = ""
		snap.Detail = ""
	}
	c.registry.SetVK(snap)
}

func (c *Connector) setStatusFromError(err error) {
	if errors.Is(err, errChannelNotFound) {
		c.setStatus(status.StateError, "VK channel not found — check the channel slug.", "")
		return
	}
	if errors.Is(err, errNoWebSocketToken) {
		c.setStatus(status.StateError, "VK Live chat token unavailable — try again later.", "")
		return
	}
	c.setStatus(status.StateError, "VK connector error — see server logs.", status.SanitizeError(err.Error()))
}
