package youtube

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/youtube/innertube"
)

type staticPageHTTPClient struct {
	responses []*http.Response
	index     int
}

func (c *staticPageHTTPClient) Do(req *http.Request) (*http.Response, error) {
	if c.index >= len(c.responses) {
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader(`{}`)),
			Header:     make(http.Header),
			Request:    req,
		}, nil
	}
	resp := c.responses[c.index]
	c.index++
	resp.Request = req
	if resp.Header == nil {
		resp.Header = make(http.Header)
	}
	return resp, nil
}

func TestDefaultPageClient_RunSession_WhenPollReturnsMessage_ExpectCallback(t *testing.T) {
	t.Parallel()

	popoutHTML := `<html><script>window["ytInitialData"] = {
		"contents": {"liveChatRenderer": {"continuations": [{"liveChatContinuationData": {"continuation": "boot-token"}}]}}
	};</script><script>"INNERTUBE_API_KEY":"page-test-key"</script></html>`

	pollBody := `{
		"continuationContents": {
			"liveChatContinuation": {
				"continuations": [{"timedContinuationData": {"continuation": "next-token", "timeoutMs": 1}}],
				"actions": [{
					"addChatItemAction": {
						"item": {
							"liveChatTextMessageRenderer": {
								"id": "msg-1",
								"timestampUsec": "1710000000000000",
								"authorExternalChannelId": "UC123",
								"authorName": {"simpleText": "Viewer"},
								"message": {"runs": [{"text": "hello"}]}
							}
						}
					}
				}]
			}
		}
	}`

	client := &defaultPageClient{
		httpClient: &staticPageHTTPClient{
			responses: []*http.Response{
				{
					StatusCode: http.StatusOK,
					Body:       io.NopCloser(strings.NewReader(popoutHTML)),
				},
				{
					StatusCode: http.StatusOK,
					Body:       io.NopCloser(strings.NewReader(pollBody)),
				},
			},
		},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	var received []innertube.LiveChatItem
	err := client.RunSession(ctx, "video-id", func(items []innertube.LiveChatItem) error {
		received = append(received, items...)
		cancel()
		return nil
	})
	require.NoError(t, err)
	require.Len(t, received, 1)
	require.Equal(t, "hello", received[0].Message)
}
