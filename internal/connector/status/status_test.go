package status

import (
	"context"
	"testing"
	"time"

	"github.com/mechastrider/comm-relay/internal/bus"
	"github.com/stretchr/testify/require"
)

func TestSanitizeError_RedactsSecrets(t *testing.T) {
	t.Parallel()

	msg := SanitizeError("oauth failed access_token=supersecret12345")
	require.NotContains(t, msg, "supersecret")
	require.Contains(t, msg, "[redacted]")
}

func TestRegistry_RecordMessage_IncrementsCounter(t *testing.T) {
	t.Parallel()

	reg := NewRegistry()
	reg.RecordMessage(PlatformTwitch)
	reg.RecordMessage(PlatformTwitch)

	require.Equal(t, uint64(2), reg.Twitch().MessageCount)
}

func TestRegistry_RunMessageCounter_ExpectIncrements(t *testing.T) {
	t.Parallel()

	b := bus.New(4)
	reg := NewRegistry()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go reg.RunMessageCounter(ctx, b)
	time.Sleep(20 * time.Millisecond)

	require.NoError(t, b.Publish(bus.ChatMessageReceived(bus.ChatMessage{
		Platform: PlatformYouTube,
		Message:  "hi",
	})))

	require.Eventually(t, func() bool {
		return reg.YouTube().MessageCount == 1
	}, time.Second, 10*time.Millisecond)
}
