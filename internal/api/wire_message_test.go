package api

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/mechastrider/comm-relay/internal/store"
)

func TestChatMessageWirePayload_WhenDisplayNameSet_ExpectSnakeCaseJSON(t *testing.T) {
	t.Parallel()

	payload, err := chatMessageWirePayload(bus.ChatMessage{
		ID:          "msg-1",
		Platform:    "twitch",
		Username:    "cmd_user",
		DisplayName: "Commander",
		Message:     "Hello",
		AvatarURL:   "https://example.com/avatar.png",
		Badges:      []string{"mod"},
		Timestamp:   time.Date(2026, 6, 5, 10, 11, 12, 0, time.UTC),
	}, false)
	require.NoError(t, err)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(payload, &decoded))

	require.Equal(t, "message", decoded["type"])
	require.Equal(t, "msg-1", decoded["id"])
	require.Equal(t, "twitch", decoded["platform"])
	require.Equal(t, "Commander", decoded["user"])
	require.Equal(t, "Hello", decoded["message"])
	require.Equal(t, "Commander", decoded["display_name"])
	require.Equal(t, "https://example.com/avatar.png", decoded["avatar_url"])
	require.Equal(t, []any{"mod"}, decoded["badges"])
	require.Equal(t, "2026-06-05T10:11:12Z", decoded["timestamp"])
	_, hasFragments := decoded["fragments"]
	require.False(t, hasFragments)
}

func TestAwardAlertWirePayload_WhenCreatedAtHasFraction_ExpectRFC3339Nano(t *testing.T) {
	t.Parallel()

	createdAt := time.Date(2026, 6, 5, 10, 11, 12, 987654321, time.UTC)
	payload, err := awardAlertWirePayload(&store.AwardType{ID: "award", Name: "Award"}, "Nova", "", "", 10, createdAt, awardAlertContext{})
	require.NoError(t, err)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(payload, &decoded))
	require.Equal(t, "2026-06-05T10:11:12.987654321Z", decoded["created_at"])
}

func TestContractAlertWirePayload_ExpectSnapshotAndSnakeCaseJSON(t *testing.T) {
	t.Parallel()

	payload, err := contractAlertWirePayload(&store.ViewerContract{
		ID:                   "contract-1",
		Title:                "Find <cache>",
		Objective:            "Mark & defend it",
		RewardID:             "spotter",
		RewardName:           "Spotter",
		RewardPoints:         25,
		RewardSplashTemplate: "ignored",
		RewardSound:          "ping",
		RewardDurationMs:     5000,
		RewardLayout:         "card",
		RewardImageFit:       "cover",
		RewardImageSizePct:   100,
	}, time.Date(2026, 9, 8, 10, 11, 12, 987654321, time.UTC))
	require.NoError(t, err)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(payload, &decoded))
	require.Equal(t, "alert", decoded["type"])
	require.Equal(t, "contract", decoded["source"])
	require.Equal(t, "contract-1", decoded["contract_id"])
	require.Equal(t, "Find <cache>", decoded["contract_title"])
	require.Equal(t, "Mark & defend it", decoded["contract_objective"])
	require.Equal(t, "spotter", decoded["award_id"])
	require.Equal(t, "Spotter", decoded["award_name"])
	require.Equal(t, float64(25), decoded["points"])
	require.Equal(t, "2026-09-08T10:11:12.987654321Z", decoded["created_at"])
}

func TestViewerProgressionWirePayload_WhenUnlockAndLevelPresent_ExpectOneCompactFrame(t *testing.T) {
	// Arrange
	previous := store.ProgressionLevel{ID: "newcomer", Title: "Newcomer", MinXP: 0}
	current := store.ProgressionLevel{ID: "regular", Title: "Regular", MinXP: 100, Announce: true}
	bundle := store.ProgressionResultBundle{PreviousLevel: &previous, CurrentLevel: &current, Unlocks: []store.AchievementUnlock{{ID: "unlock", AchievementID: "first", Occurrence: 1}}}

	// Act
	payload, ok, err := viewerProgressionWirePayload("viewer", "Viewer", "", bundle, true, bundle.Unlocks, &store.ProgressionAlertSettings{Layout: "card", SoundVolume: 70, DurationMs: 5000})

	// Assert
	require.NoError(t, err)
	require.True(t, ok)
	var decoded map[string]any
	require.NoError(t, json.Unmarshal(payload, &decoded))
	assert.Equal(t, "viewer_progression", decoded["type"])
	assert.Equal(t, "viewer", decoded["viewer_id"])
	assert.Equal(t, "Viewer", decoded["display_name"])
	assert.Equal(t, "card", decoded["layout"])
	assert.Equal(t, float64(5000), decoded["duration_ms"])
	assert.NotEmpty(t, decoded["created_at"])
	assert.Contains(t, decoded, "level")
	assert.Contains(t, decoded, "achievements")
}

func TestChatMessageWirePayload_WhenFragmentsSet_ExpectSnakeCaseJSON(t *testing.T) {
	t.Parallel()

	payload, err := chatMessageWirePayload(bus.ChatMessage{
		Platform: "twitch",
		Username: "viewer",
		Message:  "Hello Kappa",
		Fragments: []bus.MessageFragment{
			{Type: bus.FragmentTypeText, Text: "Hello "},
			{
				Type:     bus.FragmentTypeEmote,
				Text:     "Kappa",
				Provider: "twitch",
				ID:       "25",
				URL:      "https://static-cdn.jtvnw.net/emoticons/v2/25/static/dark/2.0",
				Width:    28,
				Height:   28,
			},
		},
	}, false)
	require.NoError(t, err)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(payload, &decoded))

	require.Equal(t, "Hello Kappa", decoded["message"])
	fragments, ok := decoded["fragments"].([]any)
	require.True(t, ok)
	require.Len(t, fragments, 2)

	textFrag, ok := fragments[0].(map[string]any)
	require.True(t, ok)
	require.Equal(t, "text", textFrag["type"])
	require.Equal(t, "Hello ", textFrag["text"])

	emoteFrag, ok := fragments[1].(map[string]any)
	require.True(t, ok)
	require.Equal(t, "emote", emoteFrag["type"])
	require.Equal(t, "Kappa", emoteFrag["text"])
	require.Equal(t, "twitch", emoteFrag["provider"])
	require.Equal(t, "25", emoteFrag["id"])
}

func TestChatMessageWirePayload_WhenUnknownFragmentType_ExpectMessageStillDelivered(t *testing.T) {
	t.Parallel()

	payload, err := chatMessageWirePayload(bus.ChatMessage{
		Platform: "twitch",
		Username: "viewer",
		Message:  "fallback text",
		Fragments: []bus.MessageFragment{
			{Type: "future_type", Text: "ignored by old clients"},
		},
	}, false)
	require.NoError(t, err)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(payload, &decoded))
	require.Equal(t, "fallback text", decoded["message"])
	require.NotNil(t, decoded["fragments"])
}

func TestMessageDeletedWirePayload_ExpectSnakeCaseJSON(t *testing.T) {
	t.Parallel()

	payload, err := messageDeletedWirePayload("youtube", "message-42")
	require.NoError(t, err)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(payload, &decoded))
	require.Equal(t, "message_deleted", decoded["type"])
	require.Equal(t, "youtube", decoded["platform"])
	require.Equal(t, "message-42", decoded["id"])
}
