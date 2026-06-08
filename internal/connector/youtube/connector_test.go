package youtube

import (
	"context"
	"io"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"golang.org/x/oauth2"
	"google.golang.org/api/youtube/v3"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/connector/status"
	"github.com/mechastrider/comm-relay/internal/connector/youtube/grpcproto"
)

func testStore(t *testing.T, youtubeCfg config.YouTubeConfig) *config.Store {
	t.Helper()

	path := t.TempDir() + "/config.json"
	cfg := config.Default()
	cfg.YouTube = youtubeCfg

	store, err := config.NewStore(path, cfg)
	require.NoError(t, err)

	return store
}

func TestConnector_Run_WhenDisabled_ExpectDisabledStatus(t *testing.T) {
	t.Parallel()

	eventBus := bus.New(8)
	registry := status.NewRegistry()
	store := testStore(t, config.YouTubeConfig{Enabled: false})
	connector := New(eventBus, store, registry, nil, nil)
	connector.newClient = func(ctx context.Context, tokenSource oauth2.TokenSource) (liveChatAPI, error) {
		t.Fatal("client should not be created when disabled")
		return nil, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	require.NoError(t, connector.Run(ctx))
	require.Equal(t, status.StateDisabled, registry.YouTube().State)
}

func TestConnectorRunSession_WhenLiveChatReturnsDuplicateIDs_ExpectSinglePublish(t *testing.T) {
	eventBus := bus.New(8)
	events, unsub := eventBus.Subscribe()
	defer unsub()

	store := testStore(t, testEnabledYouTubeConfig())
	connector := New(eventBus, store, status.NewRegistry(), nil, nil)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	connector.newClient = testClientFactory(t, cancel, []*youtube.LiveChatMessage{
		testLiveChatMessage("yt-1", "hello"),
		testLiveChatMessage("yt-1", "hello"),
		testLiveChatMessage("yt-2", "world"),
	})

	cfg := store.Snapshot()
	cfg.YouTube.ChatMode = config.YouTubeChatModePoll
	require.NoError(t, connector.runSession(ctx, cfg))
	require.Equal(t, []string{"yt-1", "yt-2"}, collectMessageIDs(events))
}

func TestConnectorRunSession_WhenReconnectedAndAPIReplaysMessage_ExpectDuplicateSkipped(t *testing.T) {
	eventBus := bus.New(8)
	events, unsub := eventBus.Subscribe()
	defer unsub()

	store := testStore(t, testEnabledYouTubeConfig())
	connector := New(eventBus, store, status.NewRegistry(), nil, nil)

	ctx, cancel := context.WithCancel(context.Background())
	connector.newClient = testClientFactory(t, cancel, []*youtube.LiveChatMessage{
		testLiveChatMessage("yt-1", "hello"),
	})
	cfg := store.Snapshot()
	cfg.YouTube.ChatMode = config.YouTubeChatModePoll
	require.NoError(t, connector.runSession(ctx, cfg))
	cancel()
	require.Equal(t, []string{"yt-1"}, collectMessageIDs(events))

	ctx, cancel = context.WithCancel(context.Background())
	defer cancel()
	connector.newClient = testClientFactory(t, cancel, []*youtube.LiveChatMessage{
		testLiveChatMessage("yt-1", "hello"),
	})
	cfg = store.Snapshot()
	cfg.YouTube.ChatMode = config.YouTubeChatModePoll
	require.NoError(t, connector.runSession(ctx, cfg))
	require.Empty(t, collectMessageIDs(events))
}

func TestConnectorRunSession_WhenAutoAndStreamFails_ExpectPollFallback(t *testing.T) {
	eventBus := bus.New(8)
	events, unsub := eventBus.Subscribe()
	defer unsub()

	store := testStore(t, testEnabledYouTubeConfig())
	connector := New(eventBus, store, status.NewRegistry(), nil, nil)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	connector.newGRPC = func(ctx context.Context, tokenSource oauth2.TokenSource) (grpcproto.V3DataLiveChatMessageServiceClient, io.Closer, error) {
		return &fakeGRPCClient{err: errStreamUnavailable}, io.NopCloser(nil), nil
	}
	connector.newClient = testClientFactory(t, cancel, []*youtube.LiveChatMessage{
		testLiveChatMessage("yt-1", "from poll"),
	})

	cfg := store.Snapshot()
	cfg.YouTube.ChatMode = config.YouTubeChatModeAuto
	require.NoError(t, connector.runSession(ctx, cfg))
	require.Equal(t, []string{"yt-1"}, collectMessageIDs(events))
}

func testEnabledYouTubeConfig() config.YouTubeConfig {
	return config.YouTubeConfig{
		Enabled:  true,
		ChatMode: config.YouTubeChatModePoll,
		OAuth: config.YouTubeOAuth{
			ClientID:     "client-id",
			ClientSecret: "client-secret",
			RefreshToken: "refresh-token",
		},
	}
}

func testClientFactory(t *testing.T, cancel context.CancelFunc, items []*youtube.LiveChatMessage) clientFactory {
	t.Helper()

	return func(ctx context.Context, tokenSource oauth2.TokenSource) (liveChatAPI, error) {
		return &fakeLiveChatAPI{
			cancel: cancel,
			items:  items,
		}, nil
	}
}

type fakeLiveChatAPI struct {
	cancel context.CancelFunc
	items  []*youtube.LiveChatMessage
}

func (api *fakeLiveChatAPI) ActiveLiveSession(ctx context.Context) (liveSessionInfo, error) {
	return liveSessionInfo{
		LiveChatID: "live-chat-id",
		VideoID:    "video-id",
	}, nil
}

func (api *fakeLiveChatAPI) ListMessages(ctx context.Context, liveChatID, pageToken string) (*youtube.LiveChatMessageListResponse, error) {
	api.cancel()

	return &youtube.LiveChatMessageListResponse{
		Items:                 api.items,
		NextPageToken:         "next-page-token",
		PollingIntervalMillis: 1,
	}, nil
}

func testLiveChatMessage(id, text string) *youtube.LiveChatMessage {
	return &youtube.LiveChatMessage{
		Id: id,
		Snippet: &youtube.LiveChatMessageSnippet{
			Type:           "textMessageEvent",
			DisplayMessage: text,
			TextMessageDetails: &youtube.LiveChatTextMessageDetails{
				MessageText: text,
			},
			PublishedAt: time.Date(2026, 6, 7, 19, 0, 0, 0, time.UTC).Format(time.RFC3339),
		},
		AuthorDetails: &youtube.LiveChatMessageAuthorDetails{
			ChannelId:   "UC123",
			DisplayName: "Viewer",
		},
	}
}

func collectMessageIDs(events <-chan bus.Event) []string {
	var ids []string
	for {
		select {
		case ev := <-events:
			ids = append(ids, ev.Message.ID)
		default:
			return ids
		}
	}
}
