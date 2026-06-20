package youtube

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/muonsoft/clog"
	"github.com/muonsoft/errors"
	"golang.org/x/oauth2"
	"google.golang.org/api/googleapi"
	"google.golang.org/api/option"
	"google.golang.org/api/youtube/v3"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/status"
	"github.com/mechastrider/comm-relay/internal/emote"
	"github.com/mechastrider/comm-relay/internal/emote/ytemoji"
	"github.com/mechastrider/comm-relay/internal/imagelink"
	"github.com/mechastrider/comm-relay/internal/youtube/channel"
	"github.com/mechastrider/comm-relay/internal/youtube/innertube"
	"github.com/mechastrider/comm-relay/internal/youtube/videoid"
)

const (
	configPollInterval             = 2 * time.Second
	channelLivePollInterval        = 30 * time.Second
	recentYouTubeMessageIDCapacity = 2048
)

type clientFactory func(ctx context.Context, tokenSource oauth2.TokenSource) (liveChatAPI, error)

type liveVideoResolver interface {
	ResolveLiveVideoID(ctx context.Context, ref channel.Ref) (string, error)
}

// Connector reads YouTube Live Chat for the authenticated user's active broadcast
// or from a public live video page in simple mode.
type Connector struct {
	bus             *bus.Bus
	store           *config.Store
	registry        *status.Registry
	emojiCatalog    *ytemoji.Catalog
	emojiClient     emote.HTTPDoer
	emojiRefresh    *ytemoji.Refresher
	seenMessages    *recentMessageIDs
	newClient       clientFactory
	newGRPC         grpcClientFactory
	newPageClient   func() pageChatClient
	newLiveResolver func() liveVideoResolver
}

// New creates a YouTube Live Chat connector.
func New(eventBus *bus.Bus, store *config.Store, registry *status.Registry, emojiCatalog *ytemoji.Catalog, emojiClient emote.HTTPDoer) *Connector {
	return &Connector{
		bus:          eventBus,
		store:        store,
		registry:     registry,
		emojiCatalog: emojiCatalog,
		emojiClient:  emojiClient,
		emojiRefresh: ytemoji.NewRefresher(emojiCatalog, emojiClient),
		seenMessages: newRecentMessageIDs(recentYouTubeMessageIDCapacity),
		newClient: func(ctx context.Context, tokenSource oauth2.TokenSource) (liveChatAPI, error) {
			httpClient := oauth2.NewClient(ctx, tokenSource)
			return newAPIClient(ctx, option.WithHTTPClient(httpClient))
		},
		newGRPC: defaultGRPCClientFactory,
		newPageClient: func() pageChatClient {
			return newDefaultPageClient()
		},
		newLiveResolver: func() liveVideoResolver {
			return channel.NewLiveResolver(nil)
		},
	}
}

// Run reads YouTube Live Chat until ctx is cancelled.
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
			c.setStatus(status.StateDisabled, "", "")
			backoff = newReconnectBackoff()
			if err := waitContext(ctx, configPollInterval); err != nil {
				return nil
			}
			continue
		}

		connectionMode := cfg.YouTube.ConnectionMode
		if connectionMode == "" {
			connectionMode = config.YouTubeConnectionModeAPI
		}

		if connectionMode == config.YouTubeConnectionModePage {
			videoID, autoDetect, resolveErr := c.resolvePageVideoID(ctx, cfg.YouTube)
			if resolveErr != nil {
				if errors.Is(resolveErr, channel.ErrNoLiveStream) {
					c.setStatus(status.StateConnecting, "No live stream on channel — checking again…", "")
					if err := waitContext(ctx, channelLivePollInterval); err != nil {
						return nil
					}
					continue
				}
				if errors.Is(resolveErr, errNoVideoInput) {
					c.setStatus(status.StateError, "Set channel handle or live video URL in admin.", "")
				} else if errors.Is(resolveErr, errNoChannelHandle) {
					c.setStatus(status.StateError, "Invalid YouTube channel handle.", status.SanitizeError(resolveErr.Error()))
				} else {
					c.setStatus(status.StateError, "Invalid YouTube video URL or ID.", status.SanitizeError(resolveErr.Error()))
				}
				if err := waitContext(ctx, configPollInterval); err != nil {
					return nil
				}
				continue
			}

			sessionCtx := clog.NewContext(ctx, slog.Default().With(
				slog.String("platform", platformYouTube),
				slog.String("video_id", videoID),
				slog.String("connection_mode", connectionMode),
				slog.Bool("channel_auto_detect", autoDetect),
			))

			err := c.runPageSession(sessionCtx, videoID)
			if ctx.Err() != nil {
				return nil
			}

			if err != nil {
				clog.Errorf(sessionCtx, "youtube page session ended: %w", err)
				c.setStatusFromError(err)
			} else {
				clog.Info(sessionCtx, "youtube page session ended")
				c.setStatus(status.StateDisconnected, "", "")
			}

			if autoDetect && (err == nil || errors.Is(err, errStreamEnded)) {
				c.setStatus(status.StateConnecting, "Live stream ended — checking channel again…", "")
				if waitErr := waitContext(ctx, channelLivePollInterval); waitErr != nil {
					return nil
				}
				backoff = newReconnectBackoff()
				continue
			}

			wait := backoff.current()
			c.setStatus(status.StateReconnecting, "", "")
			clog.Info(sessionCtx, "youtube reconnect scheduled", slog.Duration("after", wait))
			if err := waitContext(ctx, wait); err != nil {
				return nil
			}

			backoff = backoff.next()
			continue
		}

		if !cfg.YouTube.OAuth.HasClientCredentials() {
			c.setStatus(status.StateError, "Set YouTube OAuth client ID and secret in admin.", "")
			if err := waitContext(ctx, configPollInterval); err != nil {
				return nil
			}
			continue
		}

		if !cfg.YouTube.OAuth.Connected() {
			c.setStatus(status.StateError, "Connect YouTube in admin (OAuth).", "")
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
			c.setStatus(status.StateDisconnected, "", "")
		}

		wait := backoff.current()
		c.setStatus(status.StateReconnecting, "", "")
		clog.Info(sessionCtx, "youtube reconnect scheduled", slog.Duration("after", wait))
		if err := waitContext(ctx, wait); err != nil {
			return nil
		}

		backoff = backoff.next()
	}
}

func (c *Connector) resolvePageVideoID(ctx context.Context, ytCfg config.YouTubeConfig) (string, bool, error) {
	if strings.TrimSpace(ytCfg.VideoInput) != "" {
		id, err := videoid.ParseInput(ytCfg.VideoInput)
		return id, false, err
	}

	if strings.TrimSpace(ytCfg.ChannelHandle) == "" {
		return "", false, errNoVideoInput
	}

	ref, err := channel.ParseRef(ytCfg.ChannelHandle)
	if err != nil {
		return "", true, errors.Errorf("%w: %w", errNoChannelHandle, err)
	}

	resolver := c.newLiveResolver()
	if resolver == nil {
		return "", true, errors.New("youtube live resolver is not configured")
	}

	id, err := resolver.ResolveLiveVideoID(ctx, ref)
	return id, true, err
}

func (c *Connector) runPageSession(ctx context.Context, videoID string) error {
	c.setStatus(status.StateConnecting, "", "")

	if c.emojiRefresh != nil {
		c.emojiRefresh.EnsureGlobalLoaded(ctx)
	}
	if err := c.refreshChannelEmojis(ctx, videoID); err != nil {
		clog.Debug(ctx, "youtube channel emoji refresh failed", slog.Any("error", err))
	}

	client := c.newPageClient()
	if client == nil {
		return errors.New("youtube page client is not configured")
	}

	c.setStatus(status.StateConnected, "", "")

	return client.RunSession(ctx, videoID, func(items []innertube.LiveChatItem) error {
		c.publishPageChatItems(ctx, items)
		return nil
	})
}

func (c *Connector) publishPageChatItems(ctx context.Context, items []innertube.LiveChatItem) {
	for _, item := range items {
		overlay := c.store.Snapshot().Overlay
		chatMsg := MapPageChatMessage(item)
		if strings.TrimSpace(chatMsg.Message) == "" {
			continue
		}
		if !c.markMessageID(chatMsg.ID) {
			continue
		}
		if overlay.Emotes.YouTube && c.emojiCatalog != nil {
			messageText := item.MessageText
			if messageText == "" {
				messageText = chatMsg.Message
			}
			chatMsg.Fragments = mapEmojiFragments(messageText, c.emojiCatalog)
		}
		imagelink.Enrich(&chatMsg, overlay.ImagePreviews)
		if err := c.bus.Publish(bus.ChatMessageReceived(chatMsg)); err != nil {
			clog.Errorf(ctx, "publish youtube page message: %w", err)
		}
	}
}

func (c *Connector) runSession(ctx context.Context, cfg config.Config) error {
	oauthCfg, err := OAuthConfig(cfg)
	if err != nil {
		return err
	}

	token := tokenFromConfig(cfg.YouTube.OAuth)
	tokenSource := NewPersistingTokenSource(c.store, oauthCfg, token)

	c.setStatus(status.StateConnecting, "", "")

	client, err := c.newClient(ctx, tokenSource)
	if err != nil {
		return errors.Errorf("create youtube client: %w", err)
	}

	session, err := client.ActiveLiveSession(ctx)
	if err != nil {
		return err
	}

	sessionCtx := clog.NewContext(ctx, slog.Default().With(
		slog.String("platform", platformYouTube),
		slog.String("live_chat_id", session.LiveChatID),
		slog.String("video_id", session.VideoID),
		slog.String("chat_mode", cfg.YouTube.ChatMode),
	))

	if c.emojiRefresh != nil {
		c.emojiRefresh.EnsureGlobalLoaded(sessionCtx)
	}
	if err := c.refreshChannelEmojis(sessionCtx, session.VideoID); err != nil {
		clog.Debug(sessionCtx, "youtube channel emoji refresh failed", slog.Any("error", err))
	}

	c.setStatus(status.StateConnected, "", "")

	chatMode := cfg.YouTube.ChatMode
	if chatMode == "" {
		chatMode = config.YouTubeChatModeStream
	}

	switch chatMode {
	case config.YouTubeChatModePoll:
		return c.runPoll(sessionCtx, client, session)
	case config.YouTubeChatModeAuto:
		grpcClient, closer, err := c.newGRPC(sessionCtx, tokenSource)
		if err != nil {
			clog.Warn(sessionCtx, "youtube grpc unavailable, falling back to REST polling", slog.Any("error", err))
			c.setStatus(status.StateConnected, "Using REST polling (gRPC unavailable).", "")
			return c.runPoll(sessionCtx, client, session)
		}
		defer func() { _ = closer.Close() }()

		err = c.runStream(sessionCtx, grpcClient, session)
		if err == nil || sessionCtx.Err() != nil {
			return err
		}
		if isStreamUnavailable(err) {
			clog.Warn(sessionCtx, "youtube stream failed, falling back to REST polling", slog.Any("error", err))
			c.setStatus(status.StateConnected, "Using REST polling (gRPC stream failed).", "")
			return c.runPoll(sessionCtx, client, session)
		}
		return err
	default:
		grpcClient, closer, err := c.newGRPC(sessionCtx, tokenSource)
		if err != nil {
			return errors.Errorf("create youtube grpc client: %w", err)
		}
		defer func() { _ = closer.Close() }()

		return c.runStream(sessionCtx, grpcClient, session)
	}
}

func (c *Connector) runPoll(ctx context.Context, client liveChatAPI, session liveSessionInfo) error {
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

		resp, err := client.ListMessages(ctx, session.LiveChatID, pageToken)
		if err != nil {
			return errors.Errorf("list live chat messages: %w", err)
		}

		c.publishLiveChatItems(ctx, resp.Items)

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

func (c *Connector) publishLiveChatItems(ctx context.Context, items []*youtube.LiveChatMessage) {
	for _, item := range items {
		if item == nil {
			continue
		}
		overlay := c.store.Snapshot().Overlay
		chatMsg := MapLiveChatMessage(item)
		if strings.TrimSpace(chatMsg.Message) == "" {
			continue
		}
		if !c.markMessageID(item.Id) {
			continue
		}
		if overlay.Emotes.YouTube && c.emojiCatalog != nil {
			chatMsg.Fragments = mapEmojiFragments(messageTextFromLiveChat(item), c.emojiCatalog)
		}
		imagelink.Enrich(&chatMsg, overlay.ImagePreviews)
		if err := c.bus.Publish(bus.ChatMessageReceived(chatMsg)); err != nil {
			clog.Errorf(ctx, "publish youtube message: %w", err)
		}
	}
}

func (c *Connector) markMessageID(id string) bool {
	if c.seenMessages == nil {
		c.seenMessages = newRecentMessageIDs(recentYouTubeMessageIDCapacity)
	}

	return c.seenMessages.add(id)
}

func (c *Connector) setStatus(state status.State, detail, lastError string) {
	if c.registry == nil {
		return
	}
	snap := c.registry.YouTube()
	snap.State = state
	snap.Detail = detail
	if lastError != "" {
		snap.LastError = lastError
	}
	if state == status.StateConnected {
		snap.LastError = ""
		if detail == "" {
			snap.Detail = ""
		}
	}
	c.registry.SetYouTube(snap)
}

func (c *Connector) setStatusFromError(err error) {
	if isQuotaError(err) {
		c.setStatus(status.StateError, "YouTube API quota exceeded — try again later.", "")
		return
	}
	if errors.Is(err, errNoLiveChat) {
		c.setStatus(status.StateError, "No active YouTube live stream for this account.", "")
		return
	}
	if errors.Is(err, errStreamEnded) {
		c.setStatus(status.StateError, "YouTube live stream ended or chat is offline.", "")
		return
	}
	if errors.Is(err, errNoVideoInput) {
		c.setStatus(status.StateError, "Set channel handle or live video URL in admin.", "")
		return
	}
	if errors.Is(err, channel.ErrNoLiveStream) {
		c.setStatus(status.StateConnecting, "No live stream on channel — checking again…", "")
		return
	}
	if errors.Is(err, errNotConnected) || errors.Is(err, errNotConfigured) {
		c.setStatus(status.StateError, err.Error(), "")
		return
	}

	if apiErr, ok := errors.As[*googleapi.Error](err); ok {
		if apiErr.Code == http.StatusUnauthorized || apiErr.Code == http.StatusForbidden {
			c.setStatus(status.StateError, "YouTube authorization failed — reconnect in admin.", "")
			return
		}
	}

	c.setStatus(status.StateError, "YouTube connector error — see server logs.", status.SanitizeError(err.Error()))
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

func (c *Connector) refreshChannelEmojis(ctx context.Context, videoID string) error {
	if c == nil || c.emojiCatalog == nil || c.emojiClient == nil {
		return nil
	}

	c.emojiCatalog.ClearChannel()

	entries, err := ytemoji.FetchChannel(ctx, c.emojiClient, videoID)
	if err != nil {
		return err
	}
	if len(entries) == 0 {
		return nil
	}

	c.emojiCatalog.MergeChannel(entries)
	clog.Info(ctx, "youtube channel emoji catalog refreshed", slog.Int("shortcuts", len(entries)))
	return nil
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
