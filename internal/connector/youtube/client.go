package youtube

import (
	"context"

	"google.golang.org/api/option"
	"google.golang.org/api/youtube/v3"
)

// liveChatAPI is the subset of YouTube Data API used by the connector (mocked in tests).
type liveChatAPI interface {
	ActiveLiveChatID(ctx context.Context) (string, error)
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

func (c *apiClient) ActiveLiveChatID(ctx context.Context) (string, error) {
	call := c.svc.LiveBroadcasts.List([]string{"snippet"}).
		BroadcastStatus("active").
		Context(ctx)

	resp, err := call.Do()
	if err != nil {
		return "", err
	}

	for _, item := range resp.Items {
		if item.Snippet == nil {
			continue
		}
		id := item.Snippet.LiveChatId
		if id != "" {
			return id, nil
		}
	}

	return "", errNoLiveChat
}

func (c *apiClient) ListMessages(ctx context.Context, liveChatID, pageToken string) (*youtube.LiveChatMessageListResponse, error) {
	call := c.svc.LiveChatMessages.List(liveChatID, []string{"snippet", "authorDetails"}).
		Context(ctx)
	if pageToken != "" {
		call = call.PageToken(pageToken)
	}
	return call.Do()
}
