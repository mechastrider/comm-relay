package youtube

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/status"
	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"
	"golang.org/x/oauth2"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/option"
)

const configPollInterval = 2 * time.Second

type clientFactory func(ctx context.Context, tokenSource oauth2.TokenSource) (liveChatAPI, error)

// Connector polls YouTube Live Chat for the authenticated user's active broadcast.
type Connector struct {
	bus       *bus.Bus
	store     *config.Store
	registry  *status.Registry
	newClient clientFactory
}

// New creates a YouTube Live Chat connector.
func New(eventBus *bus.Bus, store *config.Store, registry *status.Registry) *Connector {
	return &Connector{
		bus:      eventBus,
		store:    store,
		registry: registry,
		newClient: func(ctx context.Context, tokenSource oauth2.TokenSource) (liveChatAPI, error) {
			client := oauth2.NewClient(ctx, tokenSource)
			return newAPIClient(ctx, option.WithHTTPClient(client))
		},
	}
}

// Run polls YouTube Live Chat until ctx is cancelled.
func (c *Connector) Run(ctx context.Context) error {
	clog.Info(ctx, "youtube connector starting", slog.String("platform", platformYouTube))
	defer clog.Info(ctx, "youtube connector stopped", slog.String("platform", platformYouTube))

	backoff := newReconnectBackoff()

	for {
		if ctx.Err() != nil {
			return nil
		}

		cfg := c.store.Snapshot()
		if !cfg.YouTube.Enabled {
			c.setStatus(status.StateDisabled, "")
			backoff = newReconnectBackoff()
			if err := waitContext(ctx, configPollInterval); err != nil {
				return nil
			}
			continue
		}

		if !cfg.YouTube.OAuth.HasClientCredentials() {
			c.setStatus(status.StateError, "Set YouTube OAuth client ID and secret in admin.")
			if err := waitContext(ctx, configPollInterval); err != nil {
				return nil
			}
			continue
		}

		if !cfg.YouTube.OAuth.Connected() {
			c.setStatus(status.StateError, "Connect YouTube in admin (OAuth).")
			if err := waitContext(ctx, configPollInterval); err != nil {
				return nil
			}
			continue
		}

		sessionCtx := clog.NewContext(ctx, slog.Default().With(slog.String("platform", platformYouTube)))

		err := c.runSession(sessionCtx, cfg)
		if ctx.Err() != nil {
			return nil
		}

		if err != nil {
			clog.Errorf(sessionCtx, "youtube session ended: %w", err)
			c.setStatusFromError(err)
		} else {
			clog.Info(sessionCtx, "youtube session ended")
			c.setStatus(status.StateDisconnected, "")
		}

		wait := backoff.current()
		clog.Info(sessionCtx, "youtube reconnect scheduled", slog.Duration("after", wait))
		if err := waitContext(ctx, wait); err != nil {
			return nil
		}

		backoff = backoff.next()
	}
}

func (c *Connector) runSession(ctx context.Context, cfg config.Config) error {
	oauthCfg, err := OAuthConfig(cfg)
	if err != nil {
		return err
	}

	token := tokenFromConfig(cfg.YouTube.OAuth)
	tokenSource := NewPersistingTokenSource(c.store, oauthCfg, token)

	c.setStatus(status.StateConnecting, "")

	client, err := c.newClient(ctx, tokenSource)
	if err != nil {
		return errors.Errorf("create youtube client: %w", err)
	}

	liveChatID, err := client.ActiveLiveChatID(ctx)
	if err != nil {
		return err
	}

	sessionCtx := clog.NewContext(ctx, slog.Default().With(
		slog.String("platform", platformYouTube),
		slog.String("live_chat_id", liveChatID),
	))

	c.setStatus(status.StateConnected, "")

	pageToken := ""
	pollInterval := 5 * time.Second

	for {
		if ctx.Err() != nil {
			return nil
		}

		cfg := c.store.Snapshot()
		if !cfg.YouTube.Enabled {
			return nil
		}

		resp, err := client.ListMessages(sessionCtx, liveChatID, pageToken)
		if err != nil {
			return errors.Errorf("list live chat messages: %w", err)
		}

		for _, item := range resp.Items {
			if item == nil {
				continue
			}
			chatMsg := MapLiveChatMessage(item)
			if strings.TrimSpace(chatMsg.Message) == "" {
				continue
			}
			if err := c.bus.Publish(bus.ChatMessageReceived(chatMsg)); err != nil {
				clog.Errorf(sessionCtx, "publish youtube message: %w", err)
			}
		}

		if resp.NextPageToken != "" {
			pageToken = resp.NextPageToken
		}

		if resp.PollingIntervalMillis > 0 {
			pollInterval = time.Duration(resp.PollingIntervalMillis) * time.Millisecond
		}
		if pollInterval < time.Second {
			pollInterval = time.Second
		}

		if err := waitContext(ctx, pollInterval); err != nil {
			return nil
		}
	}
}

func (c *Connector) setStatus(state status.State, detail string) {
	if c.registry == nil {
		return
	}
	c.registry.SetYouTube(status.Snapshot{State: state, Detail: detail})
}

func (c *Connector) setStatusFromError(err error) {
	if isQuotaError(err) {
		c.setStatus(status.StateError, "YouTube API quota exceeded — try again later.")
		return
	}
	if errors.Is(err, errNoLiveChat) {
		c.setStatus(status.StateError, "No active YouTube live stream for this account.")
		return
	}
	if errors.Is(err, errNotConnected) || errors.Is(err, errNotConfigured) {
		c.setStatus(status.StateError, err.Error())
		return
	}

	if apiErr, ok := errors.As[*googleapi.Error](err); ok {
		if apiErr.Code == http.StatusUnauthorized || apiErr.Code == http.StatusForbidden {
			c.setStatus(status.StateError, "YouTube authorization failed — reconnect in admin.")
			return
		}
	}

	c.setStatus(status.StateError, "YouTube connector error — see server logs.")
}

func isQuotaError(err error) bool {
	apiErr, ok := errors.As[*googleapi.Error](err)
	if !ok {
		return false
	}
	if apiErr.Code == http.StatusForbidden && strings.Contains(strings.ToLower(apiErr.Message), "quota") {
		return true
	}
	for _, reason := range apiErr.Errors {
		if strings.EqualFold(reason.Reason, "quotaExceeded") {
			return true
		}
	}
	return false
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
