package innertube

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestParseLiveChatPollResponse_WhenTextMessagePresent_ExpectItem(t *testing.T) {
	t.Parallel()

	body := []byte(`{
		"continuationContents": {
			"liveChatContinuation": {
				"continuations": [{
					"timedContinuationData": {
						"continuation": "next-token",
						"timeoutMs": 3000
					}
				}],
				"actions": [{
					"addChatItemAction": {
						"item": {
							"liveChatTextMessageRenderer": {
								"id": "msg-1",
								"timestampUsec": "1710000000000000",
								"authorExternalChannelId": "UC123",
								"authorName": {"simpleText": "Viewer"},
								"message": {"runs": [{"text": "hello chat"}]},
								"authorPhoto": {"thumbnails": [{"url": "https://example.com/avatar.jpg"}]},
								"isChatModerator": true
							}
						}
					}
				}]
			}
		}
	}`)

	result, err := ParseLiveChatPollResponse(body)
	require.NoError(t, err)
	require.Len(t, result.Items, 1)
	require.Equal(t, "msg-1", result.Items[0].ID)
	require.Equal(t, "UC123", result.Items[0].UserID)
	require.Equal(t, "Viewer", result.Items[0].DisplayName)
	require.Equal(t, "hello chat", result.Items[0].Message)
	require.Equal(t, "next-token", result.Continuation)
	require.Equal(t, 3000, result.TimeoutMs)
	require.Contains(t, result.Items[0].Badges, "moderator")
}

func TestParseLiveChatPollResponse_WhenEmojiRunHasShortcuts_ExpectMessageTextWithShortcut(t *testing.T) {
	t.Parallel()

	body := []byte(`{
		"continuationContents": {
			"liveChatContinuation": {
				"actions": [{
					"addChatItemAction": {
						"item": {
							"liveChatTextMessageRenderer": {
								"id": "msg-emoji",
								"authorExternalChannelId": "UC123",
								"authorName": {"simpleText": "Viewer"},
								"message": {"runs": [
									{"text": "hello "},
									{"emoji": {
										"emojiId": "face-blue-smiling",
										"shortcuts": [":face-blue-smiling:"],
										"image": {"thumbnails": [{"url": "https://yt3.ggpht.com/emoji.png"}]}
									}},
									{"text": " chat"}
								]}
							}
						}
					}
				}]
			}
		}
	}`)

	result, err := ParseLiveChatPollResponse(body)
	require.NoError(t, err)
	require.Len(t, result.Items, 1)
	require.Equal(t, "hello :face-blue-smiling: chat", result.Items[0].Message)
	require.Equal(t, "hello :face-blue-smiling: chat", result.Items[0].MessageText)
}

func TestParseLiveChatPollResponse_WhenOfflineBannerPresent_ExpectOffline(t *testing.T) {
	t.Parallel()

	body := []byte(`{
		"continuationContents": {
			"liveChatContinuation": {
				"actions": [{
					"addBannerToLiveChatCommand": {
						"banner": {
							"liveChatOfflineBannerRenderer": {
								"text": {"runs": [{"text": "offline"}]}
							}
						}
					}
				}]
			}
		}
	}`)

	result, err := ParseLiveChatPollResponse(body)
	require.NoError(t, err)
	require.True(t, result.Offline)
}
