package vk

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/status"
	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"
)

const configPollInterval = 2 * time.Second

// Connector reads VK Live / VK Video chat via the public WebSocket API and publishes unified messages.
type Connector struct {
	bus       *bus.Bus
	store     *config.Store
	registry  *status.Registry
	newClient func() chatClient
}

// New creates a VK Live connector that reads settings from the config store.
func New(eventBus *bus.Bus, store *config.Store, registry *status.Registry) *Connector {
	return &Connector{
		bus:      eventBus,
		store:    store,
		registry: registry,
		newClient: func() chatClient {
			return newDefaultClient()
		},
	}
}

// Run connects to VK Live chat until ctx is cancelled.
func (c *Connector) Run(ctx context.Context) error {
	clog.Info(ctx, "vk connector starting", slog.String("platform", platformVK))
	defer clog.Info(ctx, "vk connector stopped", slog.String("platform", platformVK))

	backoff := newReconnectBackoff()

	for {
		if ctx.Err() != nil {
			return nil
		}

		vkCfg := c.store.Snapshot().VK
		if !vkCfg.Enabled {
			c.setStatus(status.StateDisabled, "", "")
			backoff = newReconnectBackoff()
			if err := waitContext(ctx, configPollInterval); err != nil {
				return nil
			}
			continue
		}

		channel := normalizeChannel(vkCfg.Channel)
		if channel == "" {
			c.setStatus(status.StateError, "Set VK channel slug in admin.", "")
			if err := waitContext(ctx, configPollInterval); err != nil {
				return nil
			}
			continue
		}

		sessionCtx := clog.NewContext(ctx, slog.Default().With(
			slog.String("platform", platformVK),
			slog.String("channel", channel),
		))

		err := c.runSession(sessionCtx, channel)
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

		wait := backoff.current()
		c.setStatus(status.StateReconnecting, "", "")
		clog.Info(sessionCtx, "vk reconnect scheduled", slog.Duration("after", wait))
		if err := waitContext(ctx, wait); err != nil {
			return nil
		}

		backoff = backoff.next()
	}
}

func (c *Connector) runSession(ctx context.Context, channel string) error {
	client := c.newClient()
	c.setStatus(status.StateConnecting, "", "")

	return client.RunSession(ctx, channel, func(raw []byte) {
		chatMsg, ok := MapWSMessage(raw)
		if !ok {
			return
		}
		if strings.TrimSpace(chatMsg.Message) == "" {
			return
		}
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

func waitContext(ctx context.Context, d time.Duration) error {
	if d <= 0 {
		return nil
	}

	timer := time.NewTimer(d)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}
