package twitch

import (
	"context"
	"log/slog"
	"time"

	"github.com/gempir/go-twitch-irc/v4"
	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/retry"
	"github.com/mechastrider/comm-relay/internal/connector/status"
	"github.com/mechastrider/comm-relay/internal/emote"
	"github.com/mechastrider/comm-relay/internal/imagelink"
)

// ircClient is the subset of go-twitch-irc used by the connector (mocked in tests).
type ircClient interface {
	OnPrivateMessage(handler func(twitch.PrivateMessage))
	OnConnect(handler func())
	Join(channels ...string)
	Connect() error
	Disconnect() error
}

type clientFactory func() ircClient

const configPollInterval = 2 * time.Second

// Connector reads Twitch IRC chat (anonymous read-only) and publishes unified messages to the event bus.
// MVP uses IRC rather than EventSub for simplicity and public chat without OAuth.
type Connector struct {
	bus       *bus.Bus
	store     *config.Store
	registry  *status.Registry
	enricher  *emote.Enricher
	newClient clientFactory
}

// New creates a Twitch IRC connector that reads Twitch settings from the config store.
func New(eventBus *bus.Bus, store *config.Store, registry *status.Registry, enricher *emote.Enricher) *Connector {
	return &Connector{
		bus:      eventBus,
		store:    store,
		registry: registry,
		enricher: enricher,
		newClient: func() ircClient {
			return twitch.NewAnonymousClient()
		},
	}
}

// Run connects to Twitch IRC until ctx is cancelled. Watches the config store so admin saves take effect without restart.
func (c *Connector) Run(ctx context.Context) error {
	clog.Info(ctx, "twitch connector starting", slog.String("platform", platformTwitch))
	defer clog.Info(ctx, "twitch connector stopped", slog.String("platform", platformTwitch))

	backoff := retry.NewBackoff(time.Second, 30*time.Second)

	for {
		if ctx.Err() != nil {
			return nil
		}

		twitchCfg := c.store.Snapshot().Twitch
		if !twitchCfg.Enabled {
			c.setStatus(status.StateDisabled, "", "")
			backoff = backoff.Reset()
			if err := retry.Wait(ctx, configPollInterval); err != nil {
				return nil
			}
			continue
		}

		channel := normalizeChannel(twitchCfg.Channel)
		if channel == "" {
			c.setStatus(status.StateError, "Set Twitch channel in admin.", "")
			if err := retry.Wait(ctx, configPollInterval); err != nil {
				return nil
			}
			continue
		}

		sessionCtx := clog.NewContext(ctx, slog.Default().With(
			slog.String("platform", platformTwitch),
			slog.String("channel", channel),
		))

		err := c.runSession(sessionCtx, channel)
		if ctx.Err() != nil {
			return nil
		}

		if err != nil {
			clog.Errorf(sessionCtx, "twitch session ended: %w", err)
			c.setStatus(status.StateError, "Twitch connection failed — will retry.", status.SanitizeError(err.Error()))
		} else {
			clog.Info(sessionCtx, "twitch session ended")
		}

		wait := backoff.Current()
		c.setStatus(status.StateReconnecting, "", "")
		clog.Info(sessionCtx, "twitch reconnect scheduled", slog.Duration("after", wait))
		if err := retry.Wait(ctx, wait); err != nil {
			return nil
		}

		backoff = backoff.Next()
	}
}

func (c *Connector) runSession(ctx context.Context, channel string) error {
	c.setStatus(status.StateConnecting, "", "")

	client := c.newClient()

	client.OnConnect(func() {
		clog.Info(ctx, "twitch irc connected")
		c.setStatus(status.StateConnected, "", "")
	})

	client.OnPrivateMessage(func(msg twitch.PrivateMessage) {
		overlay := c.store.Snapshot().Overlay
		chatMsg := MapPrivateMessage(msg, overlay.Emotes.Twitch)
		if c.enricher != nil {
			c.enricher.Enrich(&chatMsg, channel, overlay.Emotes)
		}
		imagelink.Enrich(&chatMsg, overlay.ImagePreviews)
		if err := c.bus.Publish(bus.ChatMessageReceived(chatMsg)); err != nil {
			clog.Errorf(ctx, "publish twitch message: %w", err)
		}
	})

	client.Join(channel)

	connectDone := make(chan error, 1)
	go func() {
		connectDone <- client.Connect()
	}()

	select {
	case <-ctx.Done():
		_ = client.Disconnect()
		<-connectDone
		return nil
	case err := <-connectDone:
		_ = client.Disconnect()
		if err != nil {
			return errors.Errorf("twitch connect: %w", err)
		}
		return nil
	}
}

func (c *Connector) setStatus(state status.State, detail, lastError string) {
	if c.registry == nil {
		return
	}
	snap := c.registry.Twitch()
	snap.State = state
	snap.Detail = detail
	if lastError != "" {
		snap.LastError = lastError
	}
	if state == status.StateConnected {
		snap.LastError = ""
		snap.Detail = ""
	}
	c.registry.SetTwitch(snap)
}
