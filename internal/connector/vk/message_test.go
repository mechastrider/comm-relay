package vk

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestMapWSMessage_TextMessage(t *testing.T) {
	t.Parallel()

	raw := []byte(`{
		"push": {
			"channel": "channel-chat:123",
			"pub": {
				"data": {
					"type": "message",
					"data": {
						"id": 42,
						"createdAt": 1717400000,
						"author": {
							"id": 99,
							"displayName": "Viewer",
							"avatarUrl": "https://example.test/avatar.png",
							"isChatModerator": true
						},
						"data": [
							{"type": "text", "content": "[\"Hello \", \"world\"]"}
						]
					}
				}
			}
		}
	}`)

	msg, ok := MapWSMessage(raw)
	require.True(t, ok)
	require.Equal(t, "42", msg.ID)
	require.Equal(t, "vk", msg.Platform)
	require.Equal(t, "99", msg.UserID)
	require.Equal(t, "Viewer", msg.DisplayName)
	require.Equal(t, "Hello world", msg.Message)
	require.Equal(t, "https://example.test/avatar.png", msg.AvatarURL)
	require.Contains(t, msg.Badges, "chat_moderator")
	require.Equal(t, time.Unix(1717400000, 0).UTC(), msg.Timestamp)
}

func TestMapWSMessage_IgnoresNonMessageEvents(t *testing.T) {
	t.Parallel()

	raw := []byte(`{"push":{"pub":{"data":{"type":"system"}}}}`)
	_, ok := MapWSMessage(raw)
	require.False(t, ok)
}

func TestMapWSMessage_MentionBlock(t *testing.T) {
	t.Parallel()

	raw := []byte(`{
		"push": {
			"pub": {
				"data": {
					"type": "message",
					"data": {
						"id": 1,
						"createdAt": 1717400000,
						"author": {"id": 1, "displayName": "Mod"},
						"data": [
							{"type": "mention", "displayName": "Streamer"},
							{"type": "text", "content": "[\" hi\"]"}
						]
					}
				}
			}
		}
	}`)

	msg, ok := MapWSMessage(raw)
	require.True(t, ok)
	require.Equal(t, "@Streamer hi", msg.Message)
}

func TestNormalizeChannel(t *testing.T) {
	t.Parallel()

	require.Equal(t, "play_code", normalizeChannel(" @Play_Code "))
	require.Equal(t, "vkplay", normalizeChannel("/vkplay"))
}
