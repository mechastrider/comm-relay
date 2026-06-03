package twitch

import (
	"context"
	"log/slog"
	"time"

	"github.com/gempir/go-twitch-irc/v4"
	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"
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
	newClient clientFactory
}

// New creates a Twitch IRC connector that reads Twitch settings from the config store.
func New(eventBus *bus.Bus, store *config.Store) *Connector {
	return &Connector{
		bus:   eventBus,
		store: store,
		newClient: func() ircClient {
			return twitch.NewAnonymousClient()
		},
	}
}

// Run connects to Twitch IRC until ctx is cancelled. Watches the config store so admin saves take effect without restart.
func (c *Connector) Run(ctx context.Context) error {
	clog.Info(ctx, "twitch connector starting", slog.String("platform", platformTwitch))
	defer clog.Info(ctx, "twitch connector stopped", slog.String("platform", platformTwitch))

	backoff := newReconnectBackoff()

	for {
		if ctx.Err() != nil {
			return nil
		}

		twitchCfg := c.store.Snapshot().Twitch
		if !twitchCfg.Enabled {
			backoff = newReconnectBackoff()
			if err := waitContext(ctx, configPollInterval); err != nil {
				return nil
			}
			continue
		}

		channel := normalizeChannel(twitchCfg.Channel)
		if channel == "" {
			if err := waitContext(ctx, configPollInterval); err != nil {
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
		} else {
			clog.Info(sessionCtx, "twitch session ended")
		}

		wait := backoff.current()
		clog.Info(sessionCtx, "twitch reconnect scheduled", slog.Duration("after", wait))
		if err := waitContext(ctx, wait); err != nil {
			return nil
		}

		backoff = backoff.next()
	}
}

func (c *Connector) runSession(ctx context.Context, channel string) error {
	client := c.newClient()

	client.OnConnect(func() {
		clog.Info(ctx, "twitch irc connected")
	})

	client.OnPrivateMessage(func(msg twitch.PrivateMessage) {
		chatMsg := MapPrivateMessage(msg)
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
