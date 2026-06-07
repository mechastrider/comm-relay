package youtube

import (
	"context"

	"google.golang.org/api/option"
	"google.golang.org/api/youtube/v3"
)

// liveSessionInfo identifies the active YouTube live broadcast chat session.
type liveSessionInfo struct {
	LiveChatID string
	VideoID    string
}

// liveChatAPI is the subset of YouTube Data API used by the connector (mocked in tests).
type liveChatAPI interface {
	ActiveLiveSession(ctx context.Context) (liveSessionInfo, error)
	ListMessages(ctx context.Context, liveChatID, pageToken string) (*youtube.LiveChatMessageListResponse, error)
}

type apiClient struct {
	svc *youtube.Service
}

func newAPIClient(ctx context.Context, httpClient option.ClientOption) (*apiClient, error) {
	svc, err := youtube.NewService(ctx, httpClient)
	if err != nil {
		return nil, err
	}
	return &apiClient{svc: svc}, nil
}

func (c *apiClient) ActiveLiveSession(ctx context.Context) (liveSessionInfo, error) {
	call := c.svc.LiveBroadcasts.List([]string{"snippet"}).
		BroadcastStatus("active").
		Context(ctx)

	resp, err := call.Do()
	if err != nil {
		return liveSessionInfo{}, err
	}

	for _, item := range resp.Items {
		if item == nil || item.Snippet == nil {
			continue
		}
		liveChatID := item.Snippet.LiveChatId
		if liveChatID == "" {
			continue
		}
		return liveSessionInfo{
			LiveChatID: liveChatID,
			VideoID:    item.Id,
		}, nil
	}

	return liveSessionInfo{}, errNoLiveChat
}

func (c *apiClient) ListMessages(ctx context.Context, liveChatID, pageToken string) (*youtube.LiveChatMessageListResponse, error) {
	call := c.svc.LiveChatMessages.List(liveChatID, []string{"snippet", "authorDetails"}).
		Context(ctx)
	if pageToken != "" {
		call = call.PageToken(pageToken)
	}
	return call.Do()
}
