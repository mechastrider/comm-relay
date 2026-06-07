package vk

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
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

	msg, ok := MapWSMessage(raw, true)
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
	_, ok := MapWSMessage(raw, true)
	require.False(t, ok)
}

func TestMapWSMessage_StructuredTextPayload(t *testing.T) {
	t.Parallel()

	raw := []byte(`{
		"push": {
			"pub": {
				"data": {
					"type": "message",
					"data": {
						"id": 2,
						"createdAt": 1717400000,
						"author": {"id": 1, "displayName": "Viewer"},
						"data": [
							{"type": "text", "content": "[\"тест вк\",\"unstyled\",[]]"}
						]
					}
				}
			}
		}
	}`)

	msg, ok := MapWSMessage(raw, true)
	require.True(t, ok)
	require.Equal(t, "тест вк", msg.Message)
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

	msg, ok := MapWSMessage(raw, true)
	require.True(t, ok)
	require.Equal(t, "@Streamer hi", msg.Message)
}

func TestMapWSMessage_SmileBlock(t *testing.T) {
	t.Parallel()

	raw := []byte(`{
		"push": {
			"pub": {
				"data": {
					"type": "message",
					"data": {
						"id": 5,
						"createdAt": 1717400000,
						"author": {"id": 1, "displayName": "Viewer"},
						"data": [
							{"type": "text", "content": "[\"Hello \", \"unstyled\", []]"},
							{
								"type": "smile",
								"id": "42",
								"name": "kappa",
								"smallUrl": "https://example.test/smile.png"
							},
							{"type": "text", "content": "[\"!\", \"unstyled\", []]"}
						]
					}
				}
			}
		}
	}`)

	msg, ok := MapWSMessage(raw, true)
	require.True(t, ok)
	require.Equal(t, "Hello :kappa:!", msg.Message)
	require.Len(t, msg.Fragments, 3)
	require.Equal(t, bus.FragmentTypeText, msg.Fragments[0].Type)
	require.Equal(t, "Hello ", msg.Fragments[0].Text)
	require.Equal(t, bus.FragmentTypeEmote, msg.Fragments[1].Type)
	require.Equal(t, ":kappa:", msg.Fragments[1].Text)
	require.Equal(t, "vk", msg.Fragments[1].Provider)
	require.Equal(t, "42", msg.Fragments[1].ID)
	require.Equal(t, "https://example.test/smile.png", msg.Fragments[1].URL)
	require.Equal(t, bus.FragmentTypeText, msg.Fragments[2].Type)
	require.Equal(t, "!", msg.Fragments[2].Text)
}

func TestMapWSMessage_SmileOnly(t *testing.T) {
	t.Parallel()

	raw := []byte(`{
		"push": {
			"pub": {
				"data": {
					"type": "message",
					"data": {
						"id": 6,
						"createdAt": 1717400000,
						"author": {"id": 1, "displayName": "Viewer"},
						"data": [
							{
								"type": "smile",
								"id": "7",
								"name": "heart",
								"mediumUrl": "https://example.test/heart.gif",
								"isAnimated": true
							}
						]
					}
				}
			}
		}
	}`)

	msg, ok := MapWSMessage(raw, true)
	require.True(t, ok)
	require.Equal(t, ":heart:", msg.Message)
	require.Len(t, msg.Fragments, 1)
	require.Equal(t, bus.FragmentTypeEmote, msg.Fragments[0].Type)
	require.True(t, msg.Fragments[0].Animated)
}

func TestMapWSMessage_WhenVKEmotesDisabled_ExpectPlainSmileLabel(t *testing.T) {
	t.Parallel()

	raw := []byte(`{
		"push": {
			"pub": {
				"data": {
					"type": "message",
					"data": {
						"id": 8,
						"createdAt": 1717400000,
						"author": {"id": 1, "displayName": "Viewer"},
						"data": [
							{
								"type": "smile",
								"id": "42",
								"name": "kappa",
								"smallUrl": "https://example.test/smile.png"
							}
						]
					}
				}
			}
		}
	}`)

	msg, ok := MapWSMessage(raw, false)
	require.True(t, ok)
	require.Equal(t, ":kappa:", msg.Message)
	require.Nil(t, msg.Fragments)
}

func TestNormalizeChannel(t *testing.T) {
	t.Parallel()

	require.Equal(t, "play_code", normalizeChannel(" @Play_Code "))
	require.Equal(t, "vkplay", normalizeChannel("/vkplay"))
}
